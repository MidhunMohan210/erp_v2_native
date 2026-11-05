import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function load(relativePath, modules = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
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

class Database {
  constructor() {
    this.rows = new Map();
    this.statuses = new Map();
    this.failStatusWrite = false;
    this.failRowWrite = false;
  }

  async withTransactionAsync(work) {
    const beforeRows = structuredClone(this.rows);
    const beforeStatuses = structuredClone(this.statuses);
    try {
      await work();
    } catch (error) {
      this.rows = beforeRows;
      this.statuses = beforeStatuses;
      throw error;
    }
  }

  async runAsync(sql, ...values) {
    if (sql.includes("INSERT INTO offline_master_download_status")) {
      if (this.failStatusWrite) throw new Error("receipt write failed");
      this.statuses.set(JSON.stringify(values.slice(0, 2)), values[2]);
      return;
    }
    const table = sql.match(/(?:DELETE FROM|INSERT INTO) (offline_\w+)/)?.[1];
    if (!table) throw new Error(sql);
    const rows = this.rows.get(table) ?? [];
    if (sql.includes("DELETE FROM")) {
      this.rows.set(table, rows.filter((row) => row.companyId !== values[0]));
    } else {
      if (this.failRowWrite) throw new Error("row write failed");
      rows.push({ companyId: values[0], values });
      this.rows.set(table, rows);
    }
  }

  async getFirstAsync(sql, companyId, masterKey) {
    if (sql.includes("offline_master_download_status")) {
      const metadata_json = this.statuses.get(JSON.stringify([companyId, masterKey]));
      return metadata_json ? { metadata_json } : null;
    }
    const table = sql.match(/FROM (offline_\w+)/)?.[1];
    const type = sql.match(/(?:voucher_type|filter_type) = '([^']+)'/)?.[1];
    const rows = this.rows.get(table) ?? [];
    return { count: rows.filter((row) =>
      row.companyId === companyId && (!type || row.values[1] === type),
    ).length };
  }
}

function statusService(database) {
  return load("../src/offline/downloads/masterDownloadStatus.service.ts", {
    "@/offline/database/database": { withOfflineDatabase: async (_userId, work) => work(database) },
  });
}

const series = (id) => ({ _id: id, seriesName: id, prefix: "", suffix: "", currentNumber: 1,
  widthOfNumericalPart: 4, isDefault: true, currentlySelected: true, voucherType: "sale" });

const masters = [
  { key: "party", folder: "party", file: "partyMasterRepository.ts", method: "replaceDownloadedParties",
    old: [{ _id: "old", cmp_id: "a", partyName: "Old" }], newRows: [{ _id: "new", cmp_id: "a", partyName: "New" }] },
  { key: "product", folder: "product", file: "productMasterRepository.ts", method: "replaceOfflineProducts",
    old: [{ _id: "old", cmp_id: "a", product_name: "Old" }], newRows: [{ _id: "new", cmp_id: "a", product_name: "New" }] },
  { key: "priceLevel", folder: "priceLevel", file: "priceLevelMasterRepository.ts", method: "replaceOfflinePriceLevels",
    old: [{ _id: "old", pricelevel: "Old" }], newRows: [{ _id: "new", pricelevel: "New" }] },
  { key: "voucherSeries", folder: "voucherSeries", file: "voucherSeriesMasterRepository.ts", method: "replaceOfflineVoucherSeries",
    old: [series("old")], newRows: [series("new")] },
  { key: "additionalCharge", folder: "additionalCharge", file: "additionalChargeMasterRepository.ts", method: "replaceOfflineAdditionalCharges",
    old: [{ _id: "old", name: "Old" }], newRows: [{ _id: "new", name: "New" }] },
  { key: "productFilter", folder: "productFilter", file: "productFilterMasterRepository.ts", method: "replaceOfflineProductFilters",
    old: [{ _id: "old", name: "Old", filterType: "brand" }], newRows: [{ _id: "new", name: "New", filterType: "brand" }] },
];

test("migration 008 creates one company/master keyed status table", async () => {
  const statements = [];
  const { createOfflineMasterDownloadStatus } = load(
    "../src/offline/database/migrations/008_create_offline_master_download_status.ts",
  );
  await createOfflineMasterDownloadStatus.up({ execAsync: async (sql) => statements.push(sql) });
  assert.equal(createOfflineMasterDownloadStatus.version, 8);
  assert.match(statements[0], /CREATE TABLE offline_master_download_status/);
  assert.match(statements[0], /PRIMARY KEY \(company_id, master_key\)/);
});

test("all six row replacements roll back when their receipt write fails", async () => {
  for (const master of masters) {
    const database = new Database();
    const status = statusService(database);
    const repository = load(`../src/offline/${master.folder}/${master.file}`);
    const replace = repository[master.method];
    const oldReceipt = { companyId: "a", completedAt: "2026-01-01T00:00:00.000Z" };
    const newReceipt = { companyId: "a", completedAt: "2026-02-01T00:00:00.000Z" };
    await replace(database, "a", master.old, (db) => status.saveMasterDownloadStatus(db, "a", master.key, oldReceipt));
    const oldRows = structuredClone(database.rows);
    database.failStatusWrite = true;
    await assert.rejects(
      replace(database, "a", master.newRows, (db) => status.saveMasterDownloadStatus(db, "a", master.key, newReceipt)),
      /receipt write failed/,
      master.key,
    );
    assert.deepEqual(database.rows, oldRows, master.key);
    assert.equal((await status.readMasterDownloadStatus("user", "a", master.key)).completedAt, oldReceipt.completedAt);
    database.failStatusWrite = false;
    database.failRowWrite = true;
    await assert.rejects(
      replace(database, "a", master.newRows, (db) => status.saveMasterDownloadStatus(db, "a", master.key, newReceipt)),
      /row write failed/,
      master.key,
    );
    assert.deepEqual(database.rows, oldRows, master.key);
    assert.equal((await status.readMasterDownloadStatus("user", "a", master.key)).completedAt, oldReceipt.completedAt);
    database.failRowWrite = false;
    await replace(database, "a", master.newRows, (db) => status.saveMasterDownloadStatus(db, "a", master.key, newReceipt));
    assert.equal((await status.readMasterDownloadStatus("user", "a", master.key)).completedAt, newReceipt.completedAt);
  }
});

test("legacy receipts migrate only when each master's stored counts match", async () => {
  const database = new Database();
  const status = statusService(database);
  for (const master of masters) {
    const repository = load(`../src/offline/${master.folder}/${master.file}`);
    await repository[master.method](database, "a", master.old);
    const counts = master.key === "voucherSeries" ? [1, 0] : master.key === "productFilter" ? [1, 0, 0] : [1];
    const receipt = { companyId: "a", completedAt: "2026-01-01T00:00:00.000Z" };
    assert.equal(await status.migrateLegacyMasterDownloadStatus("user", "a", master.key, receipt, counts), true);
    assert.equal((await status.readMasterDownloadStatus("user", "a", master.key)).completedAt, receipt.completedAt);
    assert.equal(await status.migrateLegacyMasterDownloadStatus("user", "b", master.key, receipt, counts), false);
  }
  assert.equal(await status.migrateLegacyMasterDownloadStatus("user", "a", "party", {}, [0]), false);
});

test("all six readers validate legacy receipts before migrating them", async () => {
  const cases = [
    { folder: "party", type: "Party", key: "party", prefix: "offlinePartyMaster.v1", fields: ["partyCount"] },
    { folder: "product", type: "Product", key: "product", prefix: "offlineProductMaster.v1", fields: ["productCount"] },
    { folder: "priceLevel", type: "PriceLevel", key: "priceLevel", prefix: "offlinePriceLevelMaster.v1", fields: ["priceLevelCount"] },
    { folder: "voucherSeries", type: "VoucherSeries", key: "voucherSeries", prefix: "offlineVoucherSeriesMaster.v1", fields: ["saleCount", "saleOrderCount"] },
    { folder: "additionalCharge", type: "AdditionalCharge", key: "additionalCharge", prefix: "offlineAdditionalChargeMaster.v1", fields: ["chargeCount"] },
    { folder: "productFilter", type: "ProductFilter", key: "productFilter", prefix: "offlineProductFilterMaster.v1", fields: ["brandCount", "categoryCount", "subcategoryCount"] },
  ];
  for (const item of cases) {
    const database = new Database();
    const status = statusService(database);
    const legacy = new Map();
    const path = `../src/offline/${item.folder}/${item.folder}MasterDownloadMetadata.service.ts`;
    const readerName = item.key === "productFilter" ? "readProductFilterMetadata" : `read${item.type}MasterDownloadMetadata`;
    const { [readerName]: readMetadata } = load(path, {
      "@react-native-async-storage/async-storage": { default: { getItem: async (key) => legacy.get(key) ?? null } },
      "@/offline/downloads/masterDownloadStatus.service": status,
    });
    const key = `${item.prefix}.${encodeURIComponent(JSON.stringify(["user", "a"]))}`;
    const metadata = { companyId: "a", completedAt: "2026-01-01T00:00:00.000Z" };
    for (const field of item.fields) metadata[field] = 0;

    legacy.set(key, JSON.stringify({ ...metadata, [item.fields[0]]: 1 }));
    assert.equal(await readMetadata("user", "a"), null, item.key);
    assert.equal(await status.readMasterDownloadStatus("user", "a", item.key), null);

    legacy.set(key, JSON.stringify({ ...metadata, completedAt: "invalid" }));
    assert.equal(await readMetadata("user", "a"), null, item.key);

    legacy.set(key, JSON.stringify(metadata));
    assert.equal((await readMetadata("user", "a")).completedAt, metadata.completedAt, item.key);
    assert.equal((await status.readMasterDownloadStatus("user", "a", item.key)).completedAt, metadata.completedAt);
  }
});
