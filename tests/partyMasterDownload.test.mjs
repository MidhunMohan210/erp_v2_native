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

function party(id) {
  return { _id: id, cmp_id: "company-a", partyName: `Party ${id}` };
}

function page(number, items, total, hasMore) {
  return { data: { page: number, items, total, hasMore } };
}

function downloader(responses) {
  const calls = [];
  const { downloadPartyMaster } = loadModule(
    "../src/offline/downloads/partyMasterDownload.service.ts",
    { "@/services/api": { default: { get: async (_path, options) => {
      calls.push(options.params);
      const next = responses.shift();
      if (next instanceof Error) throw next;
      if (!next) throw new Error("Unexpected extra request");
      return next;
    } } } },
  );
  return { downloadPartyMaster, calls };
}

test("downloads all Party pages and accepts a valid empty master", async () => {
  const multi = downloader([
    page(1, [party("one")], 2, true),
    page(2, [party("two")], 2, false),
  ]);
  const parties = await multi.downloadPartyMaster("company-a");
  assert.deepEqual(Array.from(parties, (item) => item._id), ["one", "two"]);
  assert.deepEqual(multi.calls.map((params) => params.page), [1, 2]);
  assert.equal(multi.calls[0].limit, 5);
  assert.equal(multi.calls[0].cmp_id, "company-a");

  assert.deepEqual(Array.from(await downloader([page(1, [], 0, false)]).downloadPartyMaster("company-a")), []);
});

test("reports actual received and total after each valid Party page", async () => {
  const responses = [
    page(1, [1, 2, 3, 4, 5].map(party), 20, true),
    page(2, [6, 7, 8, 9, 10].map(party), 20, true),
    page(3, [11, 12, 13, 14, 15].map(party), 20, true),
    page(4, [16, 17, 18, 19, 20].map(party), 20, false),
  ];
  const progress = [];
  await downloader(responses).downloadPartyMaster("company-a", (value) => {
    progress.push([value.received, value.total]);
  });
  assert.deepEqual(progress, [[5, 20], [10, 20], [15, 20], [20, 20]]);
});

test("does not report a page that fails pagination validation", async () => {
  const progress = [];
  const run = downloader([page(1, [party("one")], 1, true)]);
  await assert.rejects(run.downloadPartyMaster("company-a", (value) => progress.push(value)), /pagination is inconsistent/);
  assert.deepEqual(progress, []);
});

test("rejects missing or invalid Party pagination fields", async () => {
  const invalidPages = [
    { items: [party("one")], total: 1, hasMore: false },
    { page: 2, items: [party("one")], total: 1, hasMore: false },
    { page: 1, items: [party("one")], hasMore: false },
    { page: 1, items: [party("one")], total: -1, hasMore: false },
    { page: 1, items: [party("one")], total: 1.5, hasMore: false },
    { page: 1, items: [party("one")], total: 1 },
    { page: 1, items: [party("one")], total: 1, hasMore: "false" },
    { page: 1, items: null, total: 1, hasMore: false },
  ];
  for (const data of invalidPages) {
    await assert.rejects(downloader([{ data }]).downloadPartyMaster("company-a"), /invalid page/);
  }
});

test("rejects changed totals, over-counts, empty continuation, and early completion", async () => {
  const cases = [
    [page(1, [party("one")], 2, true), page(2, [party("two")], 3, false)],
    [page(1, [party("one"), party("two")], 1, false)],
    [page(1, [], 1, true)],
    [page(1, [party("one")], 1, true)],
    [page(1, [party("one")], 2, false)],
  ];
  const messages = [/total changed/, /too many records/, /before all pages/, /pagination is inconsistent/, /incomplete/];
  for (let index = 0; index < cases.length; index += 1) {
    await assert.rejects(downloader(cases[index]).downloadPartyMaster("company-a"), messages[index]);
  }
});

test("an invalid or interrupted download never reaches SQLite replacement or metadata", async () => {
  let savedPartyIds = ["old"];
  let savedCount = 1;
  let replacementCalls = 0;
  let receiptWrites = 0;
  let responses = [page(1, [party("one")], 2, false)];
  const { importPartyMaster } = loadModule(
    "../src/offline/party/partyMasterImport.service.ts",
    {
      "@/offline/downloads/masterDownloadGuard.service": { withMasterDownloadGuard: async (_userId, _companyId, work) => work({ assertCurrent: () => {} }) },
      "@/offline/database/database": { withOfflineDatabase: async (_userId, work) => work({}) },
      "@/offline/downloads/partyMasterDownload.service": {
        downloadPartyMaster: (companyId) => downloader(responses).downloadPartyMaster(companyId),
      },
      "./partyMasterRepository": {
        replaceDownloadedParties: async (_database, _companyId, parties) => {
          replacementCalls += 1;
          savedPartyIds = parties.map((item) => item._id);
          savedCount = parties.length;
        },
        countDownloadedParties: async () => savedCount,
      },
      "./partyMasterDownloadMetadata.service": {
        savePartyMasterDownloadMetadata: async () => { receiptWrites += 1; },
      },
    },
  );

  await assert.rejects(importPartyMaster("user-a", "company-a"), /incomplete/);
  responses = [page(1, [party("one")], 2, true), new Error("network failed")];
  await assert.rejects(importPartyMaster("user-a", "company-a"), /network failed/);
  assert.deepEqual(savedPartyIds, ["old"]);
  assert.equal(savedCount, 1);
  assert.equal(replacementCalls, 0);
  assert.equal(receiptWrites, 0);
});
