import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTypeScript(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) {${compiled}})`, {})
    (() => { throw new Error("The tested module has no runtime imports."); }, module, module.exports);
  return module.exports;
}

class FakeDatabase {
  constructor(rows = []) {
    this.rows = rows;
    this.failOnProductId = null;
  }

  async withTransactionAsync(work) {
    const snapshot = this.rows.map((row) => ({ ...row }));
    try {
      await work();
    } catch (error) {
      this.rows = snapshot;
      throw error;
    }
  }

  async runAsync(sql, ...values) {
    if (sql.includes("DELETE FROM offline_product")) {
      this.rows = this.rows.filter((row) => row.company_id !== values[0]);
      return;
    }
    if (sql.includes("INSERT INTO offline_product")) {
      const [company_id, product_id, product_name, brand_id, category_id, sub_category_id, product_data] = values;
      if (product_id === this.failOnProductId) throw new Error("simulated insert failure");
      this.rows.push({ company_id, product_id, product_name, brand_id, category_id, sub_category_id, product_data });
      return;
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }

  async getAllAsync(sql, ...values) {
    const whereSql = sql.split("WHERE ")[1].split("ORDER BY")[0];
    const clauses = whereSql.split(" AND ").map((clause) => clause.trim());
    let rows = this.rows;
    clauses.forEach((clause, index) => {
      const value = values[index];
      if (clause === "company_id = ?") rows = rows.filter((row) => row.company_id === value);
      if (clause === "brand_id = ?") rows = rows.filter((row) => row.brand_id === value);
      if (clause === "category_id = ?") rows = rows.filter((row) => row.category_id === value);
      if (clause === "sub_category_id = ?") rows = rows.filter((row) => row.sub_category_id === value);
      if (clause.startsWith("product_name LIKE ?")) {
        const search = value.replaceAll("%", "").toLowerCase();
        rows = rows.filter((row) => row.product_name.toLowerCase().includes(search));
      }
    });
    return rows.sort((left, right) => left.product_name.localeCompare(right.product_name));
  }

  async getFirstAsync(sql, ...values) {
    if (sql.includes("COUNT(*)")) {
      return { count: this.rows.filter((row) => row.company_id === values[0]).length };
    }
    return this.rows.find(
      (row) => row.company_id === values[0] && row.product_id === values[1],
    ) ?? null;
  }
}

function product(id, name, overrides = {}) {
  return {
    _id: id,
    cmp_id: "company-a",
    product_name: name,
    brand: { _id: "brand-a", brand: "Brand A" },
    category: { _id: "category-a", category: "Category A" },
    sub_category: { _id: "sub-a", subcategory: "Sub A" },
    priceLevels: [{ priceLevel: "price-a", priceRate: 42, priceDisc: 3 }],
    GodownList: [{ _id: "stock-a", godown: "godown-a", balance_stock: 8, batch: "B-1", mfgdt: "2026-01-01", expdt: "2027-01-01", mrp: 50 }],
    saleable_stock: 8,
    cgst: 2.5,
    sgst: 2.5,
    igst: 5,
    cess: 1,
    addl_cess: 2,
    state_cess: 0.5,
    base_unit: "Nos",
    alt_unit: "Box",
    base_denominator: 1,
    alt_conversion: 12,
    batchEnabled: true,
    gdnEnabled: true,
    ...overrides,
  };
}

test("product migration creates the table and company-scoped indexes", async () => {
  const { createOfflineProduct } = loadTypeScript("../src/offline/database/migrations/003_create_offline_product.ts");
  const statements = [];
  await createOfflineProduct.up({ execAsync: async (sql) => { statements.push(sql); } });
  assert.match(statements[0], /PRIMARY KEY \(company_id, product_id\)/);
  assert.equal(statements.filter((sql) => sql.includes("CREATE INDEX offline_product_")).length, 4);
});

test("replacement preserves complete Product JSON and supports company-scoped lookup", async () => {
  const { replaceOfflineProducts, getOfflineProduct, countOfflineProducts } = loadTypeScript("../src/offline/product/productMasterRepository.ts");
  const database = new FakeDatabase();
  const saved = product("one", "Widget");

  await replaceOfflineProducts(database, "company-a", [saved]);

  const restored = JSON.parse(
    JSON.stringify(await getOfflineProduct(database, "company-a", "one")),
  );
  assert.deepEqual(restored, saved);
  assert.deepEqual(restored.priceLevels, saved.priceLevels);
  assert.deepEqual(restored.GodownList, saved.GodownList);
  assert.equal(restored.GodownList[0].balance_stock, 8);
  assert.equal(await countOfflineProducts(database, "company-a"), 1);
});

test("listing filters Product rows without crossing companies", async () => {
  const { replaceOfflineProducts, listOfflineProducts, getOfflineProduct } = loadTypeScript("../src/offline/product/productMasterRepository.ts");
  const database = new FakeDatabase();
  await replaceOfflineProducts(database, "company-a", [
    product("one", "Alpha", { brand: "brand-a" }),
    product("two", "Beta", {
      brand: { _id: "brand-b", brand: "Brand B" },
      category: { _id: "category-b", category: "Category B" },
    }),
  ]);
  await replaceOfflineProducts(database, "company-b", [
    product("other", "Alpha", { cmp_id: "company-b", brand: "brand-a" }),
  ]);

  assert.deepEqual(
    (await listOfflineProducts(database, "company-a", { brandId: "brand-a", search: "alp" })).map((item) => item._id),
    ["one"],
  );
  assert.deepEqual(
    (await listOfflineProducts(database, "company-a", {
      categoryId: "category-b",
      subCategoryId: "sub-a",
    })).map((item) => item._id),
    ["two"],
  );
  assert.deepEqual(
    (await listOfflineProducts(database, "company-b")).map((item) => item._id),
    ["other"],
  );
  assert.equal(await getOfflineProduct(database, "company-b", "one"), null);
});

test("invalid Product JSON is rejected before the previous snapshot is deleted", async () => {
  const { replaceOfflineProducts, listOfflineProducts } = loadTypeScript("../src/offline/product/productMasterRepository.ts");
  const database = new FakeDatabase();
  await replaceOfflineProducts(database, "company-a", [product("old", "Old")]);
  const invalid = product("invalid", "Invalid");
  invalid.circular = invalid;

  await assert.rejects(
    replaceOfflineProducts(database, "company-a", [invalid]),
    /could not be serialized/,
  );

  assert.deepEqual((await listOfflineProducts(database, "company-a")).map((item) => item._id), ["old"]);
});

test("failed replacement rolls back instead of deleting the previous snapshot", async () => {
  const { replaceOfflineProducts, listOfflineProducts } = loadTypeScript("../src/offline/product/productMasterRepository.ts");
  const database = new FakeDatabase();
  await replaceOfflineProducts(database, "company-a", [product("old", "Old")]);
  database.failOnProductId = "two";

  await assert.rejects(
    replaceOfflineProducts(database, "company-a", [product("one", "One"), product("two", "Two")]),
    /simulated insert failure/,
  );

  assert.deepEqual((await listOfflineProducts(database, "company-a")).map((item) => item._id), ["old"]);
});
