import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("../src/offline/product/offlineProductList.service.ts", import.meta.url),
  "utf8",
);

function loadService({ withOfflineDatabase, listOfflineProducts }) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const modules = {
    "@/offline/database/database": { withOfflineDatabase },
    "./productMasterRepository": { listOfflineProducts },
  };
  vm.runInNewContext(`(function(require, module, exports) { ${compiled} })`)(
    (name) => modules[name],
    module,
    module.exports,
  );
  return module.exports;
}

test("offline Product list uses the authenticated database and company search", async () => {
  const database = { name: "user database" };
  const calls = [];
  const service = loadService({
    withOfflineDatabase: async (userId, work) => {
      calls.push(["database", userId]);
      return work(database);
    },
    listOfflineProducts: async (receivedDatabase, companyId, filters) => {
      calls.push(["products", receivedDatabase, companyId, filters.search]);
      return [{ _id: "product-a", cmp_id: companyId, product_name: "Alpha" }];
    },
  });

  const products = await service.getSavedOfflineProducts(
    "user-a",
    "company-a",
    "alp",
  );

  assert.equal(products[0]._id, "product-a");
  assert.deepEqual(calls, [
    ["database", "user-a"],
    ["products", database, "company-a", "alp"],
  ]);
});

test("offline Product list rejects an invalid user or company before SQLite", async () => {
  let databaseCalls = 0;
  const service = loadService({
    withOfflineDatabase: async () => {
      databaseCalls += 1;
      return [];
    },
    listOfflineProducts: async () => [],
  });

  await assert.rejects(
    service.getSavedOfflineProducts("", "company-a", ""),
    /Sign in and select a company/,
  );
  await assert.rejects(
    service.getSavedOfflineProducts("user-a", " ", ""),
    /Sign in and select a company/,
  );
  assert.equal(databaseCalls, 0);
});
