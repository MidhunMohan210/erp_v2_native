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
    if (sql.includes("DELETE FROM offline_price_level")) {
      this.rows = this.rows.filter((row) => row.company_id !== values[0]);
      return;
    }
    if (sql.includes("INSERT INTO offline_price_level")) {
      const [company_id, price_level_id, price_level_name] = values;
      if (price_level_id === this.failOnId) throw new Error("simulated insert failure");
      this.rows.push({ company_id, price_level_id, price_level_name });
      return;
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }

  async getAllAsync(_sql, companyId) {
    return this.rows
      .filter((row) => row.company_id === companyId)
      .sort((left, right) => left.price_level_name.localeCompare(right.price_level_name));
  }

  async getFirstAsync(_sql, companyId) {
    return { count: this.rows.filter((row) => row.company_id === companyId).length };
  }
}

function priceLevel(id, name, overrides = {}) {
  return { _id: id, pricelevel: name, ...overrides };
}

test("Price Level migration creates a company-scoped table and name index", async () => {
  const { createOfflinePriceLevel } = loadModule(
    "../src/offline/database/migrations/004_create_offline_price_level.ts",
  );
  const statements = [];
  await createOfflinePriceLevel.up({ execAsync: async (sql) => statements.push(sql) });

  assert.match(statements[0], /PRIMARY KEY \(company_id, price_level_id\)/);
  assert.match(statements[1], /offline_price_level_company_name_idx/);
});

test("Price Levels are listed and counted within their selected company", async () => {
  const { replaceOfflinePriceLevels, listOfflinePriceLevels, countOfflinePriceLevels } = loadModule(
    "../src/offline/priceLevel/priceLevelMasterRepository.ts",
  );
  const database = new FakeDatabase();
  await replaceOfflinePriceLevels(database, "company-a", [
    priceLevel("retail", "Retail"),
    priceLevel("wholesale", "Wholesale"),
  ]);
  await replaceOfflinePriceLevels(database, "company-b", [priceLevel("other", "Other")]);

  assert.deepEqual(
    JSON.parse(JSON.stringify(await listOfflinePriceLevels(database, "company-a"))),
    [priceLevel("retail", "Retail"), priceLevel("wholesale", "Wholesale")],
  );
  assert.equal(await countOfflinePriceLevels(database, "company-a"), 2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(await listOfflinePriceLevels(database, "company-b"))),
    [priceLevel("other", "Other")],
  );
});

test("invalid or failed Price Level replacement preserves the prior snapshot", async () => {
  const { replaceOfflinePriceLevels, listOfflinePriceLevels } = loadModule(
    "../src/offline/priceLevel/priceLevelMasterRepository.ts",
  );
  const database = new FakeDatabase();
  await replaceOfflinePriceLevels(database, "company-a", [priceLevel("old", "Old")]);

  await assert.rejects(
    replaceOfflinePriceLevels(database, "company-a", [priceLevel("one", "One"), priceLevel("one", "Duplicate")]),
    /duplicate Price Level IDs/,
  );
  await assert.rejects(
    replaceOfflinePriceLevels(database, "company-a", [null]),
    /needs an ID and name/,
  );
  assert.deepEqual(
    (await listOfflinePriceLevels(database, "company-a")).map((item) => item._id),
    ["old"],
  );

  database.failOnId = "two";
  await assert.rejects(
    replaceOfflinePriceLevels(database, "company-a", [priceLevel("one", "One"), priceLevel("two", "Two")]),
    /simulated insert failure/,
  );
  assert.deepEqual(
    (await listOfflinePriceLevels(database, "company-a")).map((item) => item._id),
    ["old"],
  );
});

test("downloads the existing API response, imports it, and records completion", async () => {
  const { downloadPriceLevelMaster } = loadModule(
    "../src/offline/downloads/priceLevelMasterDownload.service.ts",
    { "@/services/api": { default: { get: async () => ({ data: [priceLevel("retail", "Retail")] }) } } },
  );
  assert.equal((await downloadPriceLevelMaster("company-a"))[0]._id, "retail");

  let rows = [];
  let savedMetadata = null;
  const { importPriceLevelMaster, getPriceLevelMasterDownloadStatus } = loadModule(
    "../src/offline/priceLevel/priceLevelMasterImport.service.ts",
    {
      "@/offline/database/database": { withOfflineDatabase: async (_userId, work) => work({}) },
      "@/offline/downloads/priceLevelMasterDownload.service": {
        downloadPriceLevelMaster: async () => [priceLevel("retail", "Retail")],
      },
      "./priceLevelMasterRepository": {
        validateOfflinePriceLevels: () => {},
        replaceOfflinePriceLevels: async (database, _companyId, items, saveCompletion) => { rows = items; await saveCompletion(database); },
        countOfflinePriceLevels: async () => rows.length,
      },
      "./priceLevelMasterDownloadMetadata.service": {
        readPriceLevelMasterDownloadMetadata: async () => savedMetadata,
        savePriceLevelMasterDownloadMetadata: async (_userId, metadata) => { savedMetadata = metadata; },
      },
    },
  );

  const metadata = await importPriceLevelMaster("user-a", "company-a");
  assert.equal(metadata.priceLevelCount, 1);
  assert.equal(savedMetadata.priceLevelCount, 1);
  assert.equal((await getPriceLevelMasterDownloadStatus("user-a", "company-a")).isComplete, true);
});
