import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function load(path, modules = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}})`, {})(
    (name) => {
      if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
      return modules[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}

class Database {
  constructor(rows = []) {
    this.rows = rows;
    this.failFilterId = null;
  }

  async withTransactionAsync(work) {
    const before = this.rows.map((row) => ({ ...row }));
    try {
      await work();
    } catch (error) {
      this.rows = before;
      throw error;
    }
  }

  async runAsync(sql, ...values) {
    if (sql.includes("DELETE FROM offline_product_filter")) {
      this.rows = this.rows.filter((row) => row.company_id !== values[0]);
      return;
    }
    if (sql.includes("INSERT INTO offline_product_filter")) {
      const [company_id, filter_type, filter_id, name, category_id] = values;
      if (filter_id === this.failFilterId) throw new Error("insert failed");
      this.rows.push({ company_id, filter_type, filter_id, name, category_id });
      return;
    }
    throw new Error(sql);
  }

  async getAllAsync(_sql, companyId, filterType) {
    return this.rows.filter(
      (row) => row.company_id === companyId && row.filter_type === filterType,
    );
  }

  async getFirstAsync(_sql, companyId, filterType) {
    return {
      count: this.rows.filter(
        (row) => row.company_id === companyId && row.filter_type === filterType,
      ).length,
    };
  }
}

const brand = (id, name) => ({ _id: id, name, filterType: "brand" });
const category = (id, name) => ({ _id: id, name, filterType: "category" });
const subcategory = (id, name, categoryId) => ({
  _id: id,
  name,
  filterType: "subcategory",
  categoryId,
});

test("Product Filter migration and repository isolate company and type rows", async () => {
  const { createOfflineProductFilter } = load(
    "../src/offline/database/migrations/007_create_offline_product_filter.ts",
  );
  const sql = [];
  await createOfflineProductFilter.up({ execAsync: async (statement) => sql.push(statement) });
  assert.match(sql[0], /PRIMARY KEY \(company_id, filter_type, filter_id\)/);

  const { listOfflineProductFilters, replaceOfflineProductFilters } = load(
    "../src/offline/productFilter/productFilterMasterRepository.ts",
  );
  const db = new Database();
  await replaceOfflineProductFilters(db, "company-a", [
    brand("brand-a", "A Brand"),
    category("category-a", "A Category"),
    subcategory("subcategory-a", "A Subcategory", "category-a"),
  ]);
  await replaceOfflineProductFilters(db, "company-b", [brand("brand-b", "B Brand")]);

  assert.deepEqual(
    (await listOfflineProductFilters(db, "company-a", "brand")).map((item) => item._id),
    ["brand-a"],
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(await listOfflineProductFilters(db, "company-a", "category")),
    ),
    [{ _id: "category-a", name: "A Category", filterType: "category", categoryId: null }],
  );
});

test("Product Filter validation rejects duplicates and orphan subcategories", async () => {
  const { validateOfflineProductFilters } = load(
    "../src/offline/productFilter/productFilterMasterRepository.ts",
  );
  assert.throws(
    () => validateOfflineProductFilters("company-a", [brand("same", "One"), category("same", "Two")]),
    /duplicate/,
  );
  assert.throws(
    () => validateOfflineProductFilters("company-a", [subcategory("sub-a", "Sub", "missing")]),
    /downloaded Category/,
  );
  assert.throws(
    () => validateOfflineProductFilters("company-a", [brand("brand-a", " ")]),
    /identity/,
  );
});

test("failed Product Filter replacement rolls back to the previous snapshot", async () => {
  const { listOfflineProductFilters, replaceOfflineProductFilters } = load(
    "../src/offline/productFilter/productFilterMasterRepository.ts",
  );
  const db = new Database();
  await replaceOfflineProductFilters(db, "company-a", [brand("old", "Old")]);
  db.failFilterId = "new-two";

  await assert.rejects(
    replaceOfflineProductFilters(db, "company-a", [
      brand("new-one", "New One"),
      brand("new-two", "New Two"),
    ]),
    /insert failed/,
  );
  assert.deepEqual(
    (await listOfflineProductFilters(db, "company-a", "brand")).map((item) => item._id),
    ["old"],
  );
});

test("Product Filter download validates the response shape", async () => {
  const { downloadProductFilters } = load(
    "../src/offline/downloads/productFilterMasterDownload.service.ts",
    {
      "@/services/api": {
        default: {
          get: async () => ({ data: { items: [{ _id: "brand-a", brand: "A Brand" }] } }),
        },
      },
    },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(await downloadProductFilters("company-a", "brand"))),
    [{ _id: "brand-a", name: "A Brand", filterType: "brand", categoryId: null }],
  );
});

test("successful Product Filter import saves per-type completion metadata", async () => {
  let savedMetadata = null;
  let savedFilters = [];
  const { getProductFilterMasterStatus, importProductFilterMaster } = load(
    "../src/offline/productFilter/productFilterMasterImport.service.ts",
    {
      "@/offline/database/database": {
        withOfflineDatabase: async (_userId, work) => work({}),
      },
      "@/offline/downloads/productFilterMasterDownload.service": {
        downloadProductFilters: async (_companyId, filterType) => {
          if (filterType === "brand") return [brand("brand-a", "A Brand")];
          if (filterType === "category") return [category("category-a", "A Category")];
          return [subcategory("subcategory-a", "A Subcategory", "category-a")];
        },
      },
      "./productFilterMasterRepository": {
        validateOfflineProductFilters: () => {},
        replaceOfflineProductFilters: async (_database, _companyId, filters) => {
          savedFilters = filters;
        },
        countOfflineProductFilters: async (_database, _companyId, filterType) =>
          savedFilters.filter((filter) => filter.filterType === filterType).length,
      },
      "./productFilterMasterDownloadMetadata.service": {
        readProductFilterMetadata: async () => savedMetadata,
        saveProductFilterMetadata: async (_userId, metadata) => {
          savedMetadata = metadata;
        },
      },
    },
  );

  const metadata = await importProductFilterMaster("user-a", "company-a");
  assert.equal(metadata.brandCount, 1);
  assert.equal(metadata.categoryCount, 1);
  assert.equal(metadata.subcategoryCount, 1);
  assert.equal(
    (await getProductFilterMasterStatus("user-a", "company-a")).isComplete,
    true,
  );
});
