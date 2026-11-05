import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadModule(relativePath, modules = {}) {
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

class FakeDatabase {
  constructor(rows = []) {
    this.rows = rows;
    this.failOnId = null;
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
    if (sql.includes("DELETE FROM offline_voucher_series")) {
      this.rows = this.rows.filter(
        (row) => row.company_id !== values[0] || !["sale", "saleOrder"].includes(row.voucher_type),
      );
      return;
    }
    if (sql.includes("INSERT INTO offline_voucher_series")) {
      const [company_id, voucher_type, series_id, series_name, prefix, suffix, current_number, number_width, is_default, currently_selected] = values;
      if (series_id === this.failOnId) throw new Error("simulated insert failure");
      this.rows.push({ company_id, voucher_type, series_id, series_name, prefix, suffix, current_number, number_width, is_default, currently_selected });
      return;
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }

  async getAllAsync(_sql, companyId, voucherType) {
    return this.rows
      .filter((row) => row.company_id === companyId && row.voucher_type === voucherType)
      .sort((left, right) => left.series_name.localeCompare(right.series_name));
  }

  async getFirstAsync(_sql, companyId, voucherType) {
    return { count: this.rows.filter((row) => row.company_id === companyId && row.voucher_type === voucherType).length };
  }
}

function series(id, voucherType, overrides = {}) {
  return {
    _id: id,
    seriesName: `${voucherType} ${id}`,
    prefix: "S",
    suffix: "",
    currentNumber: 12,
    widthOfNumericalPart: 4,
    isDefault: false,
    currentlySelected: false,
    voucherType,
    ...overrides,
  };
}

test("Voucher Series migration has a company/type primary key and lookup indexes", async () => {
  const { createOfflineVoucherSeries } = loadModule(
    "../src/offline/database/migrations/005_create_offline_voucher_series.ts",
  );
  const statements = [];
  await createOfflineVoucherSeries.up({ execAsync: async (sql) => statements.push(sql) });

  assert.match(statements[0], /PRIMARY KEY \(company_id, voucher_type, series_id\)/);
  assert.equal(statements.filter((sql) => sql.includes("CREATE INDEX offline_voucher_series_")).length, 2);
});

test("Voucher Series stays isolated by company and voucher type", async () => {
  const { replaceOfflineVoucherSeries, listOfflineVoucherSeries } = loadModule(
    "../src/offline/voucherSeries/voucherSeriesMasterRepository.ts",
  );
  const database = new FakeDatabase();
  await replaceOfflineVoucherSeries(database, "company-a", [
    series("sale-a", "sale"),
    series("order-a", "saleOrder"),
  ]);
  await replaceOfflineVoucherSeries(database, "company-b", [series("sale-b", "sale")]);

  assert.deepEqual(
    (await listOfflineVoucherSeries(database, "company-a", "sale")).map((item) => item._id),
    ["sale-a"],
  );
  assert.deepEqual(
    (await listOfflineVoucherSeries(database, "company-a", "saleOrder")).map((item) => item._id),
    ["order-a"],
  );
  assert.deepEqual(
    (await listOfflineVoucherSeries(database, "company-b", "sale")).map((item) => item._id),
    ["sale-b"],
  );
});

test("invalid data and transaction errors preserve the prior Voucher Series snapshot", async () => {
  const { replaceOfflineVoucherSeries, listOfflineVoucherSeries } = loadModule(
    "../src/offline/voucherSeries/voucherSeriesMasterRepository.ts",
  );
  const database = new FakeDatabase();
  await replaceOfflineVoucherSeries(database, "company-a", [series("old", "sale")]);

  await assert.rejects(
    replaceOfflineVoucherSeries(database, "company-a", [series("one", "sale"), series("one", "sale")]),
    /duplicate series IDs/,
  );
  await assert.rejects(
    replaceOfflineVoucherSeries(database, "company-a", [series("bad", "sale", { currentNumber: 0 })]),
    /valid identity and numbering fields/,
  );
  assert.deepEqual(
    (await listOfflineVoucherSeries(database, "company-a", "sale")).map((item) => item._id),
    ["old"],
  );

  database.failOnId = "two";
  await assert.rejects(
    replaceOfflineVoucherSeries(database, "company-a", [series("one", "sale"), series("two", "saleOrder")]),
    /simulated insert failure/,
  );
  assert.deepEqual(
    (await listOfflineVoucherSeries(database, "company-a", "sale")).map((item) => item._id),
    ["old"],
  );
});

test("recognized no-series 404 becomes an empty type while other errors propagate", async () => {
  const missingError = {
    response: { status: 404, data: { message: "No series found for this voucher type" } },
  };
  const { downloadVoucherSeriesMaster } = loadModule(
    "../src/offline/downloads/voucherSeriesMasterDownload.service.ts",
    { "@/services/api": { default: { get: async () => { throw missingError; } } } },
  );
  assert.deepEqual(JSON.parse(JSON.stringify(await downloadVoucherSeriesMaster("company-a", "sale"))), []);

  const { downloadVoucherSeriesMaster: downloadWithFailure } = loadModule(
    "../src/offline/downloads/voucherSeriesMasterDownload.service.ts",
    { "@/services/api": { default: { get: async () => { throw { response: { status: 500 } }; } } } },
  );
  await assert.rejects(downloadWithFailure("company-a", "sale"));
});

test("imports both types, supports empty Sale Order results, and records completion", async () => {
  let rows = [];
  let savedMetadata = null;
  const { importVoucherSeriesMaster, getVoucherSeriesMasterDownloadStatus } = loadModule(
    "../src/offline/voucherSeries/voucherSeriesMasterImport.service.ts",
    {
      "@/offline/downloads/masterDownloadGuard.service": { withMasterDownloadGuard: async (_userId, _companyId, work) => work({ assertCurrent: () => {} }) },
      "@/offline/database/database": { withOfflineDatabase: async (_userId, work) => work({}) },
      "@/offline/downloads/voucherSeriesMasterDownload.service": {
        downloadVoucherSeriesMaster: async (_companyId, type) => type === "sale" ? [series("sale-a", "sale")] : [],
      },
      "./voucherSeriesMasterRepository": {
        validateOfflineVoucherSeries: () => {},
        replaceOfflineVoucherSeries: async (database, _companyId, items, saveCompletion) => { rows = items; await saveCompletion(database); },
        countOfflineVoucherSeries: async (_database, _companyId, type) => rows.filter((item) => item.voucherType === type).length,
      },
      "./voucherSeriesMasterDownloadMetadata.service": {
        readVoucherSeriesMasterDownloadMetadata: async () => savedMetadata,
        saveVoucherSeriesMasterDownloadMetadata: async (_userId, metadata) => { savedMetadata = metadata; },
      },
    },
  );

  const metadata = await importVoucherSeriesMaster("user-a", "company-a");
  assert.deepEqual(JSON.parse(JSON.stringify(metadata.saleCount)), 1);
  assert.deepEqual(JSON.parse(JSON.stringify(metadata.saleOrderCount)), 0);
  assert.equal((await getVoucherSeriesMasterDownloadStatus("user-a", "company-a")).isComplete, true);
});
