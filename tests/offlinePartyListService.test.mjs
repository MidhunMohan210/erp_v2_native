import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("../src/offline/party/offlinePartyList.service.ts", import.meta.url),
  "utf8",
);
const querySource = readFileSync(
  new URL("../src/hooks/queries/partyQueries.ts", import.meta.url),
  "utf8",
);

function loadService({ withOfflineDatabase, readSavedParties }) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const modules = {
    "@/offline/database/database": { withOfflineDatabase },
    "./partyMasterRepository": { readSavedParties },
  };
  vm.runInNewContext(`(function(require, module, exports) { ${compiled} })`)(
    (name) => modules[name],
    module,
    module.exports,
  );
  return module.exports;
}

function loadOfflineQueryKeys() {
  const compiled = ts.transpileModule(querySource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const modules = {
    "@tanstack/react-query": {
      useInfiniteQuery: () => undefined,
      useQuery: () => undefined,
    },
    "@/constants/queryKeys": { QUERY_KEYS: { parties: ["parties"] } },
    "@/offline/party/offlinePartyList.service": {
      getSavedOfflineParties: async () => [],
    },
    "@/services/party.service": { partyService: {} },
  };
  vm.runInNewContext(`(function(require, module, exports) { ${compiled} })`)(
    (name) => modules[name],
    module,
    module.exports,
  );
  return module.exports.offlinePartyQueryKeys;
}

test("offline Party list uses the authenticated database, company, and search", async () => {
  const database = { name: "user database" };
  const calls = [];
  const service = loadService({
    withOfflineDatabase: async (userId, work) => {
      calls.push(["database", userId]);
      return work(database);
    },
    readSavedParties: async (receivedDatabase, companyId, search) => {
      calls.push(["parties", receivedDatabase, companyId, search]);
      return [{ _id: "party-a", cmp_id: companyId, partyName: "Alpha" }];
    },
  });

  const parties = await service.getSavedOfflineParties(
    "user-a",
    "company-a",
    "alp",
  );

  assert.equal(parties[0]._id, "party-a");
  assert.deepEqual(calls, [
    ["database", "user-a"],
    ["parties", database, "company-a", "alp"],
  ]);
});

test("offline Party list rejects an invalid user or company before SQLite", async () => {
  let databaseCalls = 0;
  const service = loadService({
    withOfflineDatabase: async () => {
      databaseCalls += 1;
      return [];
    },
    readSavedParties: async () => [],
  });

  await assert.rejects(
    service.getSavedOfflineParties("", "company-a", ""),
    /Sign in and select a company/,
  );
  await assert.rejects(
    service.getSavedOfflineParties("user-a", " ", ""),
    /Sign in and select a company/,
  );
  assert.equal(databaseCalls, 0);
});

test("offline Party cache keys isolate mode, user, company, and search", () => {
  const keys = loadOfflineQueryKeys();
  const first = Array.from(keys.list("user-a", "company-a", "alpha"));
  const second = Array.from(keys.list("user-a", "company-b", "alpha"));
  const third = Array.from(keys.list("user-a", "company-a", "beta"));

  assert.deepEqual(first, [
    "parties",
    "offline",
    "user-a",
    "company-a",
    "alpha",
  ]);
  assert.notDeepEqual(first, second);
  assert.notDeepEqual(first, third);
});
