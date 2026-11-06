import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const toolkit = require("@reduxjs/toolkit");
const serviceSource = readFileSync(new URL("../src/services/appMode.service.ts", import.meta.url), "utf8");
const sliceSource = readFileSync(new URL("../src/store/appModeSlice.ts", import.meta.url), "utf8");

function load(source, modules) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${compiled} })`) (
    (name) => {
      if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
      return modules[name];
    }, module, module.exports,
  );
  return module.exports;
}

function makeEnvironment(mastersComplete = false) {
  const saved = new Map();
  let pendingRead = null;
  let generation = 1;
  let cacheClears = 0;
  const storage = {
    getItem: async (key) => {
      if (pendingRead) await pendingRead;
      return saved.get(key) ?? null;
    },
    setItem: async (key, value) => { saved.set(key, value); },
  };
  const masterStatus = async () => ({ isComplete: mastersComplete });
  const voucherStatus = async () => ({
    isComplete: mastersComplete,
    saleStoredCount: 1,
    saleOrderStoredCount: 1,
    receiptStoredCount: 1,
  });
  const service = load(serviceSource, {
    "@react-native-async-storage/async-storage": { default: storage },
    "@/offline/party/partyMasterImport.service": { getPartyMasterDownloadStatus: masterStatus },
    "@/offline/product/productMasterImport.service": { getProductMasterDownloadStatus: masterStatus },
    "@/offline/priceLevel/priceLevelMasterImport.service": { getPriceLevelMasterDownloadStatus: masterStatus },
    "@/offline/voucherSeries/voucherSeriesMasterImport.service": { getVoucherSeriesMasterDownloadStatus: voucherStatus },
    "@/offline/additionalCharge/additionalChargeMasterImport.service": { getAdditionalChargeMasterDownloadStatus: masterStatus },
    "@/offline/productFilter/productFilterMasterImport.service": { getProductFilterMasterStatus: masterStatus },
  });
  const mode = load(sliceSource, {
    "@reduxjs/toolkit": toolkit,
    "@/services/appMode.service": service,
    "@/services/authSessionGeneration": {
      getCurrentContextGeneration: () => generation,
      isCurrentContextGeneration: (value) => value === generation,
    },
    "@/lib/queryClient": { queryClient: { cancelQueries: async () => {}, clear: () => { cacheClears += 1; } } },
  });
  let userId = "user-a";
  let companyId = "company-a";
  let modeState = mode.default(undefined, { type: "init" });
  const getState = () => ({
    appMode: modeState,
    auth: { user: userId ? { _id: userId } : null },
    company: { selectedCompany: companyId ? { _id: companyId } : null },
  });
  const dispatch = (value) => {
    if (typeof value === "function") return value(dispatch, getState);
    modeState = mode.default(modeState, value);
    return value;
  };
  return {
    service, mode, saved, dispatch, getState,
    setContext: (user, company) => { userId = user; companyId = company; generation += 1; },
    delayReads: (promise) => { pendingRead = promise; },
    cacheClears: () => cacheClears,
  };
}

test("new user and company contexts start Online, and their storage keys differ", async () => {
  const env = makeEnvironment();
  assert.notEqual(env.service.getAppModeStorageKey("user-a", "company-a"), env.service.getAppModeStorageKey("user-b", "company-a"));
  assert.notEqual(env.service.getAppModeStorageKey("user-a", "company-a"), env.service.getAppModeStorageKey("user-a", "company-b"));
  await env.dispatch(env.mode.restoreAppMode({ userId: "user-a", companyId: "company-a" }));
  assert.equal(env.getState().appMode.mode, "online");
});

test("Offline activation is rejected without masters and keeps Online APIs active", async () => {
  const env = makeEnvironment();
  await env.dispatch(env.mode.restoreAppMode({ userId: "user-a", companyId: "company-a" }));
  assert.equal(await env.dispatch(env.mode.switchAppMode("offline", { userId: "user-a", companyId: "company-a" })), "unavailable");
  assert.equal(env.getState().appMode.mode, "online");
  assert.equal(env.saved.size, 0);
  assert.equal(env.cacheClears(), 0);
});

test("complete masters still cannot activate unfinished Offline business screens", async () => {
  const env = makeEnvironment(true);
  assert.equal(await env.service.hasCompleteOfflineMasterData("user-a", "company-a"), true);
  assert.equal(await env.dispatch(env.mode.switchAppMode("offline", { userId: "user-a", companyId: "company-a" })), "unavailable");
  assert.equal(env.getState().appMode.mode, "online");
  await env.service.saveAppMode("user-a", "company-a", "offline");
  await env.dispatch(env.mode.restoreAppMode({ userId: "user-a", companyId: "company-a" }));
  assert.equal(env.getState().appMode.mode, "online");
  assert.equal(await env.service.readAppMode("user-a", "company-a"), "online");
});

test("a confirmed Online choice is stored for this context and clears old query results", async () => {
  const env = makeEnvironment();
  await env.dispatch(env.mode.restoreAppMode({ userId: "user-a", companyId: "company-a" }));
  assert.equal(await env.dispatch(env.mode.switchAppMode("online", { userId: "user-a", companyId: "company-a" })), "changed");
  assert.equal(await env.service.readAppMode("user-a", "company-a"), "online");
  assert.equal(env.cacheClears(), 1);
  assert.equal(await env.service.readAppMode("user-a", "company-b"), "online");
});

test("a saved Offline value without masters is reset to Online on restart", async () => {
  const env = makeEnvironment();
  await env.service.saveAppMode("user-a", "company-a", "offline");
  await env.dispatch(env.mode.restoreAppMode({ userId: "user-a", companyId: "company-a" }));
  assert.equal(env.getState().appMode.mode, "online");
  assert.equal(await env.service.readAppMode("user-a", "company-a"), "online");
});

test("a delayed read from the previous company cannot replace the current mode", async () => {
  const env = makeEnvironment();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  env.delayReads(held);
  const oldRestore = env.dispatch(env.mode.restoreAppMode({ userId: "user-a", companyId: "company-a" }));
  env.setContext("user-a", "company-b");
  env.delayReads(null);
  await env.dispatch(env.mode.restoreAppMode({ userId: "user-a", companyId: "company-b" }));
  release();
  await oldRestore;
  assert.equal(env.getState().appMode.companyId, "company-b");
  assert.equal(env.getState().appMode.mode, "online");
});

test("a delayed read from the previous user cannot replace the new user's mode", async () => {
  const env = makeEnvironment();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  env.delayReads(held);
  const oldRestore = env.dispatch(env.mode.restoreAppMode({ userId: "user-a", companyId: "company-a" }));
  env.setContext("user-b", "company-a");
  env.delayReads(null);
  await env.dispatch(env.mode.restoreAppMode({ userId: "user-b", companyId: "company-a" }));
  release();
  await oldRestore;
  assert.equal(env.getState().appMode.userId, "user-b");
  assert.equal(env.getState().appMode.mode, "online");
});

test("confirmation made for an old company cannot change the new company", async () => {
  const env = makeEnvironment();
  env.setContext("user-a", "company-b");
  assert.equal(await env.dispatch(env.mode.switchAppMode("online", { userId: "user-a", companyId: "company-a" })), "stale");
  assert.equal(env.saved.size, 0);
});
