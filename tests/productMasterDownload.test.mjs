import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadModule(relativePath, modules) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) {${compiled}})`, {})
    ((name) => {
      if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
      return modules[name];
    }, module, module.exports);
  return module.exports;
}

function product(id, overrides = {}) {
  return {
    _id: id,
    cmp_id: "company-a",
    product_name: `Product ${id}`,
    base_unit: "Nos",
    alt_unit: null,
    base_denominator: null,
    alt_conversion: null,
    hsn_code: "8471",
    cgst: 9,
    sgst: 9,
    igst: 18,
    cess: 0,
    addl_cess: 0,
    state_cess: 0,
    priceLevels: [{ priceLevel: "retail", priceRate: 100, priceDisc: 0 }],
    GodownList: [{ _id: `stock-${id}`, godown: "godown-a", balance_stock: 4, batch: "B-1", mrp: 120 }],
    ...overrides,
  };
}

test("downloads every Product page and reports received records against the API total", async () => {
  const calls = [];
  const pages = [
    { data: { items: [product("one")], page: 1, hasMore: true, total: 2, limit: 500 } },
    { data: { items: [product("two")], page: 2, hasMore: false, total: 2, limit: 500 } },
  ];
  const { downloadProductMaster } = loadModule(
    "../src/offline/downloads/productMasterDownload.service.ts",
    {
      "@/services/api": { default: {
        get: async (_path, options) => {
          calls.push(options.params);
          return pages.shift();
        },
      } },
    },
  );
  const progress = [];
  const products = await downloadProductMaster("company-a", (value) => progress.push(value));

  assert.equal(JSON.stringify(products.map((item) => item._id)), JSON.stringify(["one", "two"]));
  assert.equal(
    JSON.stringify(progress),
    JSON.stringify([{ received: 1, total: 2 }, { received: 2, total: 2 }]),
  );
  assert.deepEqual(calls.map((params) => params.page), [1, 2]);
});

test("rejects interrupted or inconsistent Product pagination", async () => {
  const pages = [
    { data: { items: [product("one")], page: 1, hasMore: true, total: 2, limit: 500 } },
    { data: { items: [], page: 2, hasMore: false, total: 2, limit: 500 } },
  ];
  const { downloadProductMaster } = loadModule(
    "../src/offline/downloads/productMasterDownload.service.ts",
    { "@/services/api": { default: { get: async () => pages.shift() } } },
  );

  await assert.rejects(downloadProductMaster("company-a"), /incomplete/);
});

test("validates Sale and Sale Order Product fields and rejects another company's data", () => {
  const { validateDownloadedProducts } = loadModule(
    "../src/offline/product/productMasterImport.service.ts",
    {
      "@/offline/database/database": {},
      "@/offline/product/productMasterRepository": {},
      "@/offline/product/productMasterDownloadMetadata.service": {},
      "@/offline/downloads/productMasterDownload.service": {},
    },
  );

  assert.doesNotThrow(() => validateDownloadedProducts([product("one")], "company-a"));
  assert.doesNotThrow(() => validateDownloadedProducts([
    product("manual", {
      cess: undefined,
      addl_cess: undefined,
      state_cess: undefined,
      GodownList: [{ _id: "stock-manual", godown: "godown-a", balance_stock: 0, batch: "" }],
    }),
  ], "company-a"));
  assert.throws(
    () => validateDownloadedProducts([product("one", { cmp_id: "company-b" })], "company-a"),
    /invalid Product/,
  );
  assert.throws(
    () => validateDownloadedProducts([product("one"), product("one")], "company-a"),
    /duplicate Product IDs/,
  );
  assert.throws(
    () => validateDownloadedProducts([product("bad", { GodownList: [{ _id: "", godown: "godown-a", balance_stock: 1 }] })], "company-a"),
    /invalid stock row/,
  );
});

test("imports atomically and records completion only after replacement succeeds", async () => {
  let rows = [product("old")];
  let savedMetadata = null;
  let shouldFail = false;
  const { importProductMaster, getProductMasterDownloadStatus } = loadModule(
    "../src/offline/product/productMasterImport.service.ts",
    {
      "@/offline/database/database": {
        withOfflineDatabase: async (_userId, work) => work({}),
      },
      "@/offline/product/productMasterRepository": {
        replaceOfflineProducts: async (database, _companyId, products, saveCompletion) => {
          const previous = rows;
          rows = [];
          if (shouldFail) {
            rows = previous;
            throw new Error("simulated insert failure");
          }
          rows = products;
          await saveCompletion(database);
        },
        countOfflineProducts: async () => rows.length,
      },
      "@/offline/product/productMasterDownloadMetadata.service": {
        readProductMasterDownloadMetadata: async () => savedMetadata,
        saveProductMasterDownloadMetadata: async (_userId, metadata) => {
          savedMetadata = metadata;
        },
      },
      "@/offline/downloads/productMasterDownload.service": {
        downloadProductMaster: async (_companyId, onProgress) => {
          onProgress?.({ received: 1, total: 1 });
          return [product("new")];
        },
      },
    },
  );

  const metadata = await importProductMaster("user-a", "company-a");
  assert.equal(metadata.productCount, 1);
  assert.deepEqual(rows.map((item) => item._id), ["new"]);
  assert.equal(savedMetadata.companyId, "company-a");

  shouldFail = true;
  await assert.rejects(importProductMaster("user-a", "company-a"), /simulated insert failure/);
  assert.deepEqual(rows.map((item) => item._id), ["new"]);

  rows = [];
  savedMetadata = { companyId: "company-a", productCount: 0, completedAt: new Date().toISOString() };
  assert.equal(
    JSON.stringify(await getProductMasterDownloadStatus("user-a", "company-a")),
    JSON.stringify({ metadata: savedMetadata, storedCount: 0, isComplete: true }),
  );
});
