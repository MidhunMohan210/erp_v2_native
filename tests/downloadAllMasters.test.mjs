import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadCoordinator(failAt = null) {
  const source = readFileSync(new URL("../src/offline/downloads/downloadAllMasters.service.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const calls = [];
  const guard = { userId: "user-a", companyId: "company-a", assertCurrent: () => {} };
  class MasterDownloadCancelledError extends Error {}
  let releases = 0;
  const makeImport = (name) => async (_userId, _companyId, heldGuard, saving, progress) => {
    assert.equal(heldGuard, guard);
    calls.push(name);
    if (name === "Party") {
      progress({ received: 5, total: 20 });
      progress({ received: 10, total: 20 });
      progress({ received: 15, total: 20 });
      progress({ received: 20, total: 20 });
    }
    saving();
    if (failAt === name) throw new Error("network failed");
  };
  const modules = {
    "@/offline/party/partyMasterImport.service": { importPartyMaster: makeImport("Party") },
    "@/offline/product/productMasterImport.service": { importProductMaster: async (_userId, _companyId, progress, heldGuard, saving) => {
      assert.equal(heldGuard, guard);
      calls.push("Product");
      progress({ received: 1, total: 2 });
      progress({ received: 2, total: 2 });
      saving();
      if (failAt === "Product") throw new Error("network failed");
    } },
    "@/offline/priceLevel/priceLevelMasterImport.service": { importPriceLevelMaster: makeImport("Price Level") },
    "@/offline/voucherSeries/voucherSeriesMasterImport.service": { importVoucherSeriesMaster: makeImport("Voucher Series") },
    "@/offline/additionalCharge/additionalChargeMasterImport.service": { importAdditionalChargeMaster: makeImport("Additional Charges") },
    "@/offline/productFilter/productFilterMasterImport.service": { importProductFilterMaster: makeImport("Product Filters") },
    "./masterDownloadGuard.service": {
      acquireMasterDownloadGuard: () => guard,
      releaseMasterDownloadGuard: (value) => { assert.equal(value, guard); releases += 1; },
      MasterDownloadCancelledError,
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) {${code}})`, {})
    ((name) => {
      if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
      return modules[name];
    }, module, module.exports);
  return { coordinator: module.exports, calls, guard, MasterDownloadCancelledError, getReleases: () => releases };
}

test("Download All refreshes all six in order and counts only completed imports", async () => {
  const { coordinator, calls, getReleases } = loadCoordinator();
  const events = [];
  await coordinator.downloadAllMasters("user-a", "company-a", (event) => events.push(event));
  assert.deepEqual(calls, ["Party", "Product", "Price Level", "Voucher Series", "Additional Charges", "Product Filters"]);
  assert.deepEqual(events.filter((event) => event.phase === "completed").map((event) => event.completed), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(events.filter((event) => event.phase === "partyProgress").map((event) => [event.received, event.total]), [[5, 20], [10, 20], [15, 20], [20, 20]]);
  assert.deepEqual(events.filter((event) => event.phase === "productProgress").map((event) => [event.received, event.total]), [[1, 2], [2, 2]]);
  assert.equal(events.find((event) => event.phase === "saving" && event.key === "products").completed, 1);
  assert.equal(getReleases(), 1);
});

test("first failure stops the sequence, reports its master, releases, and retry starts at Party", async () => {
  const failed = loadCoordinator("Price Level");
  const events = [];
  await assert.rejects(
    failed.coordinator.downloadAllMasters("user-a", "company-a", (event) => events.push(event)),
    (error) => error.master === "Price Level" && /network failed/.test(error.message),
  );
  assert.deepEqual(failed.calls, ["Party", "Product", "Price Level"]);
  assert.deepEqual(events.filter((event) => event.phase === "completed").map((event) => event.completed), [1, 2]);
  assert.equal(failed.getReleases(), 1);

  const retry = loadCoordinator();
  await retry.coordinator.downloadAllMasters("user-a", "company-a", () => {});
  assert.equal(retry.calls[0], "Party");
  assert.equal(retry.calls.length, 6);
  assert.equal(retry.getReleases(), 1);
});

test("context cancellation between masters stops the run and releases the lock", async () => {
  const run = loadCoordinator();
  const events = [];
  await assert.rejects(
    run.coordinator.downloadAllMasters("user-a", "company-a", (event) => {
      events.push(event);
      if (event.phase === "completed" && event.completed === 1) {
        run.guard.assertCurrent = () => { throw new run.MasterDownloadCancelledError(); };
      }
    }),
    run.MasterDownloadCancelledError,
  );
  assert.deepEqual(run.calls, ["Party"]);
  assert.deepEqual(events.filter((event) => event.phase === "completed").map((event) => event.completed), [1]);
  assert.equal(run.getReleases(), 1);
});
