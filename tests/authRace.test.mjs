import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const toolkit = require("@reduxjs/toolkit");
const authSource = readFileSync(new URL("../src/store/authSlice.ts", import.meta.url), "utf8");
const generationSource = readFileSync(new URL("../src/services/authSessionGeneration.ts", import.meta.url), "utf8");

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function loadTypeScript(source, modules, globals = {}) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${compiled} })`, globals)(
    (name) => {
      if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
      return modules[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}

function makeEnvironment() {
  const stored = new Map();
  const database = { activeUser: null, closedUsers: [], openedUsers: [] };
  let onSet = async () => {};
  let fetchResponse = async () => { throw new Error("offline"); };
  const generation = loadTypeScript(generationSource, {});
  const action = (type) => () => ({ type });
  const modules = {
    "@reduxjs/toolkit": toolkit,
    "expo-secure-store": {
      getItemAsync: async (key) => stored.get(key) ?? null,
      setItemAsync: async (key, value) => {
        await onSet(key, value);
        stored.set(key, value);
      },
      deleteItemAsync: async (key) => { stored.delete(key); },
    },
    "@/store/companySlice": { clearSelectedCompany: action("company/clear") },
    "@/store/voucherDraftSlice": { resetVoucherDraft: action("voucher/reset") },
    "@/store/saleDraftSlice": { resetSaleDraft: action("sale/reset") },
    "@/store/receiptDraftSlice": { clearReceiptDraft: action("receipt/clear") },
    "@/store/appModeSlice": { resetAppMode: action("appMode/reset") },
    "@/lib/queryClient": { queryClient: { clear: () => {} } },
    "@/constants/config": { CONFIG: { BASE_URL: "https://example.test" } },
    "@/services/authSessionGeneration": generation,
    "@/services/companySelectionPersistence": { LEGACY_SELECTED_COMPANY_KEY: "selectedCompany" },
    "@/offline/database/database": {
      activateOfflineDatabase: async (userId) => {
        if (database.activeUser && database.activeUser !== userId) {
          throw new Error("Previous database still open");
        }
        database.activeUser = userId;
        database.openedUsers.push(userId);
      },
      closeOfflineDatabase: async () => {
        if (database.activeUser) database.closedUsers.push(database.activeUser);
        database.activeUser = null;
      },
    },
  };
  const auth = loadTypeScript(authSource, modules, {
    __DEV__: false,
    fetch: (...args) => fetchResponse(...args),
  });
  let authState = auth.default(undefined, { type: "init" });
  const actions = [];
  const getState = () => ({ auth: authState });
  const dispatch = (value) => {
    if (typeof value === "function") return value(dispatch, getState);
    actions.push(value.type);
    authState = auth.default(authState, value);
    return value;
  };
  const user = (id) => ({ _id: id, name: id, email: `${id}@test.com`, role: "staff" });
  return {
    auth, generation, stored, database, actions, dispatch, getState, user,
    setOnSet: (callback) => { onSet = callback; },
    setFetch: (callback) => { fetchResponse = callback; },
  };
}

test("overlapping logins serialize writes and keep the newer user and database", async () => {
  const env = makeEnvironment();
  const entered = deferred();
  const release = deferred();
  env.setOnSet(async (key, value) => {
    if (key === "token" && value === "token-A") {
      entered.resolve();
      await release.promise;
    }
  });
  const first = env.dispatch(env.auth.persistAuth(env.user("A"), "token-A"));
  await entered.promise;
  const second = env.dispatch(env.auth.persistAuth(env.user("B"), "token-B"));
  const tokenRead = env.auth.readStoredAuthToken();
  release.resolve();
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.equal(env.stored.get("token"), "token-B");
  assert.equal(await tokenRead, "token-B");
  assert.equal(JSON.parse(env.stored.get("user"))._id, "B");
  assert.equal(env.getState().auth.user._id, "B");
  assert.equal(env.database.activeUser, "B");
});

test("a request that read a token before a login change is stale", async () => {
  const env = makeEnvironment();
  await env.dispatch(env.auth.persistAuth(env.user("A"), "token-A"));
  const requestGeneration = env.generation.getCurrentAuthGeneration();
  await env.dispatch(env.auth.persistAuth(env.user("B"), "token-B"));
  assert.equal(env.generation.isCurrentAuthGeneration(requestGeneration), false);
  assert.equal(await env.auth.readStoredAuthToken(), "token-B");
});

test("an older login response cannot persist after a newer login", async () => {
  const env = makeEnvironment();
  const firstAttempt = env.auth.beginLoginAttempt();
  const secondAttempt = env.auth.beginLoginAttempt();
  assert.equal(env.auth.isLatestLoginAttempt(firstAttempt), false);
  assert.equal(env.auth.isLatestLoginAttempt(secondAttempt), true);
  assert.equal(await env.dispatch(env.auth.persistAuth(env.user("B"), "token-B", secondAttempt)), true);
  assert.equal(await env.dispatch(env.auth.persistAuth(env.user("A"), "token-A", firstAttempt)), false);
  assert.equal(env.stored.get("token"), "token-B");
  assert.equal(env.database.activeUser, "B");
});

test("an old automatic 401 cleanup cannot log out a newer user", async () => {
  const env = makeEnvironment();
  await env.dispatch(env.auth.persistAuth(env.user("A"), "token-A"));
  const oldGeneration = env.generation.getCurrentAuthGeneration();
  await env.dispatch(env.auth.persistAuth(env.user("B"), "token-B"));
  await env.dispatch(env.auth.logoutAuth(oldGeneration));
  assert.equal(env.getState().auth.user._id, "B");
  assert.equal(env.stored.get("token"), "token-B");
  assert.equal(env.database.activeUser, "B");
  assert.deepEqual(env.database.closedUsers, ["A"]);
});

test("logout waits for a pending login write and preserves offline data", async () => {
  const env = makeEnvironment();
  env.stored.set("offline.db.key.A", "existing-key");
  const pendingSubmissions = new Map([["A", "existing-pending-payload"]]);
  const entered = deferred();
  const release = deferred();
  env.setOnSet(async (key) => {
    if (key === "token") {
      entered.resolve();
      await release.promise;
    }
  });
  const login = env.dispatch(env.auth.persistAuth(env.user("A"), "token-A"));
  await entered.promise;
  const logout = env.dispatch(env.auth.logoutAuth());
  release.resolve();
  assert.equal(await login, false);
  await logout;
  assert.equal(env.stored.has("token"), false);
  assert.equal(env.stored.has("user"), false);
  assert.equal(env.stored.get("offline.db.key.A"), "existing-key");
  assert.equal(pendingSubmissions.get("A"), "existing-pending-payload");
  assert.equal(env.getState().auth.user, null);
  assert.equal(env.database.activeUser, null);
});

for (const status of [401, 403]) test(`a restore ${status} cannot clear a newer login`, async () => {
  const env = makeEnvironment();
  env.stored.set("token", "saved-A");
  env.stored.set("user", JSON.stringify(env.user("A")));
  const entered = deferred();
  const release = deferred();
  env.setFetch(async () => {
    entered.resolve();
    await release.promise;
    return { status, ok: false };
  });
  const restore = env.dispatch(env.auth.rehydrateAuth());
  await entered.promise;
  await env.dispatch(env.auth.persistAuth(env.user("B"), "token-B"));
  release.resolve();
  await restore;
  assert.equal(env.stored.get("token"), "token-B");
  assert.equal(env.getState().auth.user._id, "B");
  assert.equal(env.database.activeUser, "B");
});

test("logout while restoration is pending prevents it from reopening a database", async () => {
  const env = makeEnvironment();
  env.stored.set("token", "saved-A");
  env.stored.set("user", JSON.stringify(env.user("A")));
  const entered = deferred();
  const release = deferred();
  env.setFetch(async () => {
    entered.resolve();
    await release.promise;
    return { status: 200, ok: true, json: async () => ({ user: env.user("A") }) };
  });
  const restore = env.dispatch(env.auth.rehydrateAuth());
  await entered.promise;
  await env.dispatch(env.auth.logoutAuth());
  release.resolve();
  await restore;
  assert.equal(env.getState().auth.user, null);
  assert.equal(env.stored.has("token"), false);
  assert.equal(env.database.activeUser, null);
});

test("a failed second SecureStore write cannot leave mixed credentials", async () => {
  const env = makeEnvironment();
  await env.dispatch(env.auth.persistAuth(env.user("A"), "token-A"));
  env.setOnSet(async (key, value) => {
    if (key === "user" && JSON.parse(value)._id === "B") throw new Error("storage failed");
  });
  await assert.rejects(env.dispatch(env.auth.persistAuth(env.user("B"), "token-B")), /storage failed/);
  assert.equal(env.stored.has("token"), false);
  assert.equal(env.stored.has("user"), false);
  assert.equal(env.getState().auth.user, null);
  assert.equal(env.database.activeUser, null);
});

test("old-token cleanup can finish while a new login request is pending", async () => {
  const env = makeEnvironment();
  const entered = deferred();
  const release = deferred();
  env.stored.set("token", "saved-A");
  env.stored.set("user", JSON.stringify(env.user("A")));
  env.setFetch(async () => {
    entered.resolve();
    await release.promise;
    return { status: 401, ok: false };
  });
  const restore = env.dispatch(env.auth.rehydrateAuth());
  await entered.promise;
  const attempt = env.auth.beginLoginAttempt();
  release.resolve();
  await restore;
  assert.equal(env.stored.has("token"), false);
  assert.equal(env.getState().auth.user, null);
  assert.equal(await env.dispatch(env.auth.persistAuth(env.user("B"), "token-B", attempt)), true);
  assert.equal(env.getState().auth.user._id, "B");
  assert.equal(env.database.activeUser, "B");
});

test("an explicit logout invalidates a login response still in flight", async () => {
  const env = makeEnvironment();
  const attempt = env.auth.beginLoginAttempt();
  await env.dispatch(env.auth.logoutAuth());
  assert.equal(env.auth.isLatestLoginAttempt(attempt), false);
  assert.equal(await env.dispatch(env.auth.persistAuth(env.user("A"), "token-A", attempt)), false);
  assert.equal(env.stored.has("token"), false);
  assert.equal(env.database.activeUser, null);
});

test("online login, verified restoration, user switch, and logout still work", async () => {
  const env = makeEnvironment();
  await env.dispatch(env.auth.persistAuth(env.user("A"), "token-A"));
  assert.equal(env.getState().auth.isAuthenticated, true);
  await env.dispatch(env.auth.logoutAuth());
  assert.equal(env.getState().auth.isAuthenticated, false);
  assert.equal(env.database.activeUser, null);
  env.stored.set("token", "token-A");
  env.stored.set("user", JSON.stringify(env.user("A")));
  env.setFetch(async () => ({
    status: 200,
    ok: true,
    json: async () => ({ user: env.user("A") }),
  }));
  await env.dispatch(env.auth.rehydrateAuth());
  assert.equal(env.getState().auth.user._id, "A");
  assert.equal(env.database.activeUser, "A");
  await env.dispatch(env.auth.persistAuth(env.user("B"), "token-B"));
  assert.equal(env.database.activeUser, "B");
  assert.equal(env.database.closedUsers.includes("A"), true);
  await env.dispatch(env.auth.logoutAuth());
  assert.equal(env.getState().auth.isAuthenticated, false);
  assert.equal(env.stored.has("token"), false);
});
