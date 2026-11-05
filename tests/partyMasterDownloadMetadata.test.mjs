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

function party(id, overrides = {}) {
  return {
    _id: id,
    cmp_id: "company-a",
    partyName: `Party ${id}`,
    ...overrides,
  };
}

test("reads Party completion metadata from company-scoped SQLite status", async () => {
  const values = new Map();
  const status = {
    readMasterDownloadStatus: async (userId, companyId, masterKey) =>
      values.get(JSON.stringify([userId, companyId, masterKey])) ?? null,
    saveMasterDownloadStatus: async (_database, companyId, masterKey, metadata) => {
      values.set(JSON.stringify(["user-a", companyId, masterKey]), metadata);
    },
  };
  const {
    readPartyMasterDownloadMetadata,
    savePartyMasterDownloadMetadata,
  } = loadModule(
    "../src/offline/party/partyMasterDownloadMetadata.service.ts",
    {
      "@react-native-async-storage/async-storage": { default: { getItem: async () => null } },
      "@/offline/downloads/masterDownloadStatus.service": status,
    },
  );

  await savePartyMasterDownloadMetadata({}, {
    companyId: "company-a",
    partyCount: 0,
    completedAt: new Date().toISOString(),
  });

  assert.equal((await readPartyMasterDownloadMetadata("user-a", "company-a"))?.partyCount, 0);
  assert.equal(await readPartyMasterDownloadMetadata("user-a", "company-b"), null);
  assert.equal(await readPartyMasterDownloadMetadata("user-b", "company-a"), null);
});

test("records Party completion only after replacement succeeds and verifies the local count", async () => {
  let storedCount = 1;
  let savedMetadata = null;
  let shouldFail = false;
  const { importPartyMaster, getPartyMasterDownloadStatus } = loadModule(
    "../src/offline/party/partyMasterImport.service.ts",
    {
      "@/offline/downloads/masterDownloadGuard.service": { withMasterDownloadGuard: async (_userId, _companyId, work) => work({ assertCurrent: () => {} }) },
      "@/offline/database/database": {
        withOfflineDatabase: async (_userId, work) => work({}),
      },
      "@/offline/downloads/partyMasterDownload.service": {
        downloadPartyMaster: async () => [party("one")],
      },
      "./partyMasterRepository": {
        replaceDownloadedParties: async (database, _companyId, _parties, saveCompletion) => {
          if (shouldFail) throw new Error("simulated insert failure");
          storedCount = 1;
          await saveCompletion(database);
        },
        readSavedParties: async () => [],
        countDownloadedParties: async () => storedCount,
      },
      "./partyMasterDownloadMetadata.service": {
        readPartyMasterDownloadMetadata: async () => savedMetadata,
        savePartyMasterDownloadMetadata: async (_userId, metadata) => {
          savedMetadata = metadata;
        },
      },
    },
  );

  const metadata = await importPartyMaster("user-a", "company-a");
  assert.equal(metadata.partyCount, 1);
  assert.equal(savedMetadata.partyCount, 1);

  shouldFail = true;
  await assert.rejects(importPartyMaster("user-a", "company-a"), /simulated insert failure/);
  assert.equal(savedMetadata.partyCount, 1);

  storedCount = 0;
  assert.equal((await getPartyMasterDownloadStatus("user-a", "company-a")).isComplete, false);

  savedMetadata = { companyId: "company-a", partyCount: 0, completedAt: new Date().toISOString() };
  assert.equal((await getPartyMasterDownloadStatus("user-a", "company-a")).isComplete, true);
});
