import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../src/services/appMode.service.ts", import.meta.url), "utf8");

function loadReadiness(overrides = {}) {
  const calls = [];
  const complete = { isComplete: true };
  const statuses = {
    party: complete,
    product: complete,
    priceLevel: complete,
    voucherSeries: {
      isComplete: true,
      saleStoredCount: 1,
      saleOrderStoredCount: 1,
      receiptStoredCount: 1,
    },
    additionalCharge: complete,
    productFilter: complete,
    ...overrides,
  };
  const status = (key) => async (userId, companyId) => {
    calls.push([key, userId, companyId]);
    if (statuses[key] instanceof Error) throw statuses[key];
    return statuses[key];
  };
  const modules = {
    "@react-native-async-storage/async-storage": { default: {} },
    "@/offline/party/partyMasterImport.service": { getPartyMasterDownloadStatus: status("party") },
    "@/offline/product/productMasterImport.service": { getProductMasterDownloadStatus: status("product") },
    "@/offline/priceLevel/priceLevelMasterImport.service": { getPriceLevelMasterDownloadStatus: status("priceLevel") },
    "@/offline/voucherSeries/voucherSeriesMasterImport.service": { getVoucherSeriesMasterDownloadStatus: status("voucherSeries") },
    "@/offline/additionalCharge/additionalChargeMasterImport.service": { getAdditionalChargeMasterDownloadStatus: status("additionalCharge") },
    "@/offline/productFilter/productFilterMasterImport.service": { getProductFilterMasterStatus: status("productFilter") },
  };
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${compiled} })`)(
    (name) => modules[name], module, module.exports,
  );
  return { ready: module.exports.hasCompleteOfflineMasterData, calls };
}

test("all six completed masters and three voucher types are ready", async () => {
  const { ready, calls } = loadReadiness();
  assert.equal(await ready("user-a", "company-a"), true);
  assert.equal(calls.length, 6);
  assert.ok(calls.every(([, userId, companyId]) => userId === "user-a" && companyId === "company-a"));
});

test("completed empty non-voucher masters are ready", async () => {
  const { ready } = loadReadiness({
    party: { isComplete: true, storedCount: 0 },
    product: { isComplete: true, storedCount: 0 },
    priceLevel: { isComplete: true, storedCount: 0 },
    additionalCharge: { isComplete: true, storedCount: 0 },
    productFilter: { isComplete: true, counts: { brand: 0, category: 0, subcategory: 0 } },
  });
  assert.equal(await ready("user-a", "company-a"), true);
});

test("each incomplete master blocks readiness", async () => {
  for (const key of ["party", "product", "priceLevel", "voucherSeries", "additionalCharge", "productFilter"]) {
    const { ready } = loadReadiness({ [key]: { isComplete: false } });
    assert.equal(await ready("user-a", "company-a"), false, key);
  }
});

test("a missing Sale, Sale Order, or Receipt series blocks readiness", async () => {
  for (const key of ["saleStoredCount", "saleOrderStoredCount", "receiptStoredCount"]) {
    const { ready } = loadReadiness({
      voucherSeries: {
        isComplete: true,
        saleStoredCount: 1,
        saleOrderStoredCount: 1,
        receiptStoredCount: 1,
        [key]: 0,
      },
    });
    assert.equal(await ready("user-a", "company-a"), false, key);
  }
});

test("blank context and SQLite status errors return not ready", async () => {
  const { ready, calls } = loadReadiness();
  assert.equal(await ready(" ", "company-a"), false);
  assert.equal(await ready("user-a", " "), false);
  assert.equal(await ready(undefined, "company-a"), false);
  assert.equal(await ready("user-a", null), false);
  assert.equal(calls.length, 0);
  const failed = loadReadiness({ product: new Error("database unavailable") });
  assert.equal(await failed.ready("user-a", "company-a"), false);
});
