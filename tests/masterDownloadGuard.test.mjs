import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function load(path, modules) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) {${code}})`, {})
    ((name) => {
      if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
      return modules[name];
    }, module, module.exports);
  return module.exports;
}

function environment() {
  const context = { generation: 1, userId: "user-a", companyId: "company-a" };
  const guard = load("../src/offline/downloads/masterDownloadGuard.service.ts", {
    "@/services/authSessionGeneration": {
      getCurrentContextGeneration: () => context.generation,
      isCurrentContextGeneration: (generation) => generation === context.generation,
    },
    "@/store": { store: { getState: () => ({
      auth: { user: context.userId ? { _id: context.userId } : null },
      company: { selectedCompany: context.companyId ? { _id: context.companyId } : null },
    }) } },
  });
  return { context, guard };
}

const product = {
  _id: "product-a", cmp_id: "company-a", product_name: "Product A", base_unit: "Nos",
  alt_unit: null, base_denominator: null, alt_conversion: null, hsn_code: "8471",
  cgst: 9, sgst: 9, igst: 18, priceLevels: [], GodownList: [],
};

const masters = [
  { folder: "party", method: "importPartyMaster", download: "@/offline/downloads/partyMasterDownload.service", downloadMethod: "downloadPartyMaster", repository: "./partyMasterRepository", replace: "replaceDownloadedParties", metadata: "./partyMasterDownloadMetadata.service", save: "savePartyMasterDownloadMetadata", rows: [{ _id: "party-a", cmp_id: "company-a", partyName: "Party A" }] },
  { folder: "product", method: "importProductMaster", download: "@/offline/downloads/productMasterDownload.service", downloadMethod: "downloadProductMaster", repository: "@/offline/product/productMasterRepository", replace: "replaceOfflineProducts", metadata: "@/offline/product/productMasterDownloadMetadata.service", save: "saveProductMasterDownloadMetadata", rows: [product] },
  { folder: "priceLevel", method: "importPriceLevelMaster", download: "@/offline/downloads/priceLevelMasterDownload.service", downloadMethod: "downloadPriceLevelMaster", repository: "./priceLevelMasterRepository", replace: "replaceOfflinePriceLevels", metadata: "./priceLevelMasterDownloadMetadata.service", save: "savePriceLevelMasterDownloadMetadata", rows: [{ _id: "level-a", pricelevel: "Retail" }] },
  { folder: "voucherSeries", method: "importVoucherSeriesMaster", download: "@/offline/downloads/voucherSeriesMasterDownload.service", downloadMethod: "downloadVoucherSeriesMaster", repository: "./voucherSeriesMasterRepository", replace: "replaceOfflineVoucherSeries", metadata: "./voucherSeriesMasterDownloadMetadata.service", save: "saveVoucherSeriesMasterDownloadMetadata", rows: [] },
  { folder: "additionalCharge", method: "importAdditionalChargeMaster", download: "@/offline/downloads/additionalChargeMasterDownload.service", downloadMethod: "downloadAdditionalChargeMaster", repository: "./additionalChargeMasterRepository", replace: "replaceOfflineAdditionalCharges", metadata: "./additionalChargeMasterDownloadMetadata.service", save: "saveAdditionalChargeMasterDownloadMetadata", rows: [] },
  { folder: "productFilter", method: "importProductFilterMaster", download: "@/offline/downloads/productFilterMasterDownload.service", downloadMethod: "downloadProductFilters", repository: "./productFilterMasterRepository", replace: "replaceOfflineProductFilters", metadata: "./productFilterMasterDownloadMetadata.service", save: "saveProductFilterMetadata", rows: [] },
];

function importer(master, guard, download, databaseWork, replaceWork) {
  const calls = { replaced: 0, saved: 0 };
  const modules = {
    "@/offline/downloads/masterDownloadGuard.service": guard,
    "@/offline/database/database": { withOfflineDatabase: databaseWork },
    [master.download]: { [master.downloadMethod]: download },
    [master.repository]: {
      validateOfflinePriceLevels: () => {},
      validateOfflineVoucherSeries: () => {},
      validateOfflineAdditionalCharges: () => {},
      validateOfflineProductFilters: () => {},
      [master.replace]: async (database, _companyId, _rows, saveCompletion) => {
        calls.replaced += 1;
        if (replaceWork) return replaceWork(database, saveCompletion);
        await saveCompletion(database);
      },
    },
    [master.metadata]: { [master.save]: async () => { calls.saved += 1; } },
  };
  const service = load(`../src/offline/${master.folder}/${master.folder}MasterImport.service.ts`, modules);
  return { run: () => service[master.method]("user-a", "company-a"), calls };
}

test("one lock blocks duplicate and different master work, then releases on every outcome", async () => {
  const { context, guard } = environment();
  const lockStates = [];
  const unsubscribe = guard.subscribeToMasterDownload(() => {
    lockStates.push(guard.isMasterDownloadRunning());
  });
  const first = guard.acquireMasterDownloadGuard("user-a", "company-a");
  assert.equal(guard.isMasterDownloadRunning(), true);
  assert.throws(() => guard.acquireMasterDownloadGuard("user-a", "company-a"), guard.MasterDownloadBusyError);
  assert.throws(() => guard.acquireMasterDownloadGuard("user-a", "other-company"), guard.MasterDownloadBusyError);

  await guard.withMasterDownloadGuard("user-a", "company-a", async (owned) => owned.assertCurrent(), first);
  assert.equal(guard.isMasterDownloadRunning(), true);
  guard.releaseMasterDownloadGuard(first);
  assert.equal(guard.isMasterDownloadRunning(), false);

  await assert.rejects(guard.withMasterDownloadGuard("user-a", "company-a", async () => {
    throw new Error("network failed");
  }), /network failed/);
  assert.equal(guard.isMasterDownloadRunning(), false);

  const cancelled = guard.acquireMasterDownloadGuard("user-a", "company-a");
  context.generation += 1;
  assert.throws(() => cancelled.assertCurrent(), guard.MasterDownloadCancelledError);
  guard.releaseMasterDownloadGuard(cancelled);
  assert.equal(guard.isMasterDownloadRunning(), false);
  assert.deepEqual(lockStates, [true, false, true, false, true, false]);
  unsubscribe();
});

test("guard checks user, company, and generation independently", () => {
  for (const change of [
    (context) => { context.userId = "user-b"; },
    (context) => { context.companyId = "company-b"; },
    (context) => { context.generation += 1; },
  ]) {
    const { context, guard } = environment();
    const active = guard.acquireMasterDownloadGuard("user-a", "company-a");
    change(context);
    assert.throws(() => active.assertCurrent(), guard.MasterDownloadCancelledError);
    guard.releaseMasterDownloadGuard(active);
  }
});

test("all six imports stop before SQLite after a session or company change", async () => {
  for (const [index, master] of masters.entries()) {
    const { context, guard } = environment();
    let finishDownload;
    let databaseCalls = 0;
    const pending = new Promise((resolve) => { finishDownload = resolve; });
    const service = importer(master, guard, async () => {
      await pending;
      return master.rows;
    }, async (_userId, work) => { databaseCalls += 1; return work({}); });

    const running = service.run();
    await assert.rejects(service.run(), guard.MasterDownloadBusyError, master.folder);
    if (index % 2 === 0) {
      context.generation += 1;
      context.companyId = "company-b";
    } else {
      context.generation += 1;
      context.userId = null;
    }
    finishDownload();
    await assert.rejects(running, guard.MasterDownloadCancelledError, master.folder);
    assert.equal(databaseCalls, 0, master.folder);
    assert.equal(service.calls.replaced, 0, master.folder);
    assert.equal(service.calls.saved, 0, master.folder);
    assert.equal(guard.isMasterDownloadRunning(), false, master.folder);
  }
});

test("all six imports recheck context inside the database queue", async () => {
  for (const master of masters) {
    const { context, guard } = environment();
    const service = importer(master, guard, async () => master.rows, async (_userId, work) => {
      context.generation += 1;
      context.companyId = "company-b";
      return work({});
    });
    await assert.rejects(service.run(), guard.MasterDownloadCancelledError, master.folder);
    assert.equal(service.calls.replaced, 0, master.folder);
    assert.equal(service.calls.saved, 0, master.folder);
    assert.equal(guard.isMasterDownloadRunning(), false, master.folder);
  }
});

test("a context change during replacement rolls back rows and leaves receipts unchanged", async () => {
  for (const master of masters) {
    const { context, guard } = environment();
    let rows = ["old"];
    const service = importer(master, guard, async () => master.rows,
      async (_userId, work) => work({}),
      async (database, saveCompletion) => {
        const previous = rows;
        rows = ["new"];
        context.generation += 1;
        try {
          await saveCompletion(database);
        } catch (error) {
          rows = previous;
          throw error;
        }
      },
    );
    await assert.rejects(service.run(), guard.MasterDownloadCancelledError, master.folder);
    assert.deepEqual(rows, ["old"], master.folder);
    assert.equal(service.calls.saved, 0, master.folder);
    assert.equal(guard.isMasterDownloadRunning(), false, master.folder);
  }
});
