// Exercises the offline connection lifecycle with a small SQLite/SecureStore
// model. A real Android build is still needed to verify native SQLCipher.
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../src/offline/database/database.ts", import.meta.url), "utf8");

function makeEnvironment() {
  const files = new Map();
  const keys = new Map();
  const migrations = [{ version: 1, name: "ledger", up: async (db) => db.execAsync("CREATE TABLE _offline_migrations") }];
  let cipherEnabled = true;
  let openCount = 0;

  class FakeFile {
    constructor(_directory, name) { this.name = name; }
    get exists() { return files.has(this.name); }
  }

  class FakeDatabase {
    constructor(file) {
      this.file = file;
      this.key = null;
      this.closed = false;
      this.foreignKeys = false;
    }
    checkOpen() { if (this.closed) throw new Error("connection closed"); }
    checkKey() {
      this.checkOpen();
      if (!this.key || (this.file.key && this.file.key !== this.key)) {
        throw new Error("SQLITE_NOTADB: wrong key");
      }
    }
    async execAsync(sql) {
      this.checkOpen();
      if (sql.startsWith("PRAGMA key")) {
        this.key = sql.match(/[0-9a-f]{64}/)?.[0] ?? null;
      } else if (sql.includes("PRAGMA foreign_keys = ON")) {
        this.checkKey();
        this.foreignKeys = true;
      } else if (sql.includes("CREATE TABLE")) {
        this.checkKey();
        this.file.key = this.key;
        this.file.hasLedger = true;
      }
    }
    async getFirstAsync(sql) {
      this.checkOpen();
      if (sql === "PRAGMA cipher_version") {
        return cipherEnabled ? { cipher_version: "4.6" } : null;
      }
      this.checkKey();
      if (sql.includes("sqlite_master") && sql.includes("COUNT")) return { count: 1 };
      if (sql.includes("sqlite_master") && sql.includes("_offline_migrations")) {
        return this.file.hasLedger ? { name: "_offline_migrations" } : null;
      }
      if (sql.includes("journal_mode")) return { journal_mode: "wal" };
      if (sql.includes("foreign_keys")) return { foreign_keys: Number(this.foreignKeys) };
      return null;
    }
    async getAllAsync() { this.checkKey(); return this.file.ledger.map((version) => ({ version })); }
    async runAsync(_sql, version) { this.checkKey(); this.file.ledger.push(version); }
    async withTransactionAsync(work) {
      const before = { key: this.file.key, ledger: [...this.file.ledger], hasLedger: this.file.hasLedger };
      try { await work(); } catch (error) {
        Object.assign(this.file, before);
        throw error;
      }
    }
    async closeAsync() { this.closed = true; }
  }

  const modules = {
    "expo-crypto": {
      CryptoDigestAlgorithm: { SHA256: "sha256" },
      digestStringAsync: async (_algorithm, value) => createHash("sha256").update(value).digest("hex"),
      getRandomBytesAsync: async (count) => randomBytes(count),
    },
    "expo-file-system": { File: FakeFile },
    "expo-secure-store": {
      getItemAsync: async (name) => keys.get(name) ?? null,
      setItemAsync: async (name, value) => { keys.set(name, value); },
    },
    "expo-sqlite": {
      defaultDatabaseDirectory: "file:///db",
      openDatabaseAsync: async (name) => {
        if (name === ":memory:") return new FakeDatabase({ key: null, ledger: [], hasLedger: false });
        openCount += 1;
        if (!files.has(name)) files.set(name, { key: null, ledger: [], hasLedger: false, marker: null });
        return new FakeDatabase(files.get(name));
      },
    },
    "react-native": { Platform: { OS: "android" } },
    "./migrations": { migrations },
  };

  function loadManager() {
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext("(function(require, module, exports) {" + compiled + "})", {})
      ((name) => {
        if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
        return modules[name];
      }, module, module.exports);
    return module.exports;
  }

  function identity(userId) {
    const digest = createHash("sha256").update(userId).digest("hex");
    return { fileName: `erp_v2_user_${digest}.db`, keyName: `offline.db.key.${digest}` };
  }

  function authenticate(userId) {
    keys.set("token", `session-${userId}`);
    keys.set("user", JSON.stringify({ _id: userId }));
  }

  return { files, keys, migrations, loadManager, identity, authenticate, setCipherEnabled: (value) => { cipherEnabled = value; }, getOpenCount: () => openCount };
}

test("creates an encrypted user file once and reopens it with the saved key", async () => {
  const environment = makeEnvironment();
  environment.authenticate("A");
  let database = environment.loadManager();
  await Promise.all([database.activateOfflineDatabase("A"), database.activateOfflineDatabase("A")]);
  const { fileName, keyName } = environment.identity("A");
  assert.match(environment.keys.get(keyName), /^[0-9a-f]{64}$/);
  assert.equal(environment.files.get(fileName).key, environment.keys.get(keyName));
  assert.deepEqual(environment.files.get(fileName).ledger, [1]);
  assert.equal(environment.getOpenCount(), 1);
  await database.closeOfflineDatabase();
  database = environment.loadManager(); // Simulates a fresh JS process after app restart.
  await database.activateOfflineDatabase("A");
  assert.deepEqual(environment.files.get(fileName).ledger, [1]);
  assert.equal(environment.getOpenCount(), 2);
});

test("a user ID cannot open a database without matching authentication", async () => {
  const environment = makeEnvironment();
  const database = environment.loadManager();
  await assert.rejects(database.activateOfflineDatabase("A"), /Authentication is required/);
  assert.equal(environment.getOpenCount(), 0);
  environment.authenticate("B");
  await assert.rejects(database.activateOfflineDatabase("A"), /Authentication is required/);
  assert.equal(environment.getOpenCount(), 0);
});

test("switching users closes A and keeps each user's data separate", async () => {
  const environment = makeEnvironment();
  environment.authenticate("A");
  const database = environment.loadManager();
  await database.activateOfflineDatabase("A");
  const aConnection = await database.withOfflineDatabase("A", async (connection) => {
    connection.file.marker = "A data";
    return connection;
  });
  environment.authenticate("B");
  await database.activateOfflineDatabase("B");
  assert.equal(aConnection.closed, true);
  await assert.rejects(database.withOfflineDatabase("A", async () => null), /No offline database/);
  assert.equal(await database.withOfflineDatabase("B", async (connection) => connection.file.marker), null);
  await database.closeOfflineDatabase();
  environment.authenticate("A");
  await database.activateOfflineDatabase("A");
  assert.equal(await database.withOfflineDatabase("A", async (connection) => connection.file.marker), "A data");
});

test("revoked authentication cannot keep using an open connection", async () => {
  const environment = makeEnvironment();
  environment.authenticate("A");
  const database = environment.loadManager();
  await database.activateOfflineDatabase("A");
  environment.keys.delete("token");
  await assert.rejects(database.withOfflineDatabase("A", async () => "data"), /Authentication is required/);
  await database.closeOfflineDatabase();
});

test("missing and incorrect keys reject without replacing the file", async () => {
  const environment = makeEnvironment();
  environment.authenticate("A");
  const database = environment.loadManager();
  await database.activateOfflineDatabase("A");
  await database.closeOfflineDatabase();
  const { fileName, keyName } = environment.identity("A");
  const originalKey = environment.files.get(fileName).key;
  environment.keys.delete(keyName);
  await assert.rejects(database.activateOfflineDatabase("A"), /encryption key.*missing/);
  assert.equal(environment.files.get(fileName).key, originalKey);
  assert.equal(environment.keys.has(keyName), false);
  environment.keys.set(keyName, "f".repeat(64));
  await assert.rejects(database.activateOfflineDatabase("A"), /Could not unlock/);
  assert.equal(environment.files.get(fileName).key, originalKey);
});

test("a build without SQLCipher cannot run migrations", async () => {
  const environment = makeEnvironment();
  environment.authenticate("A");
  environment.setCipherEnabled(false);
  const database = environment.loadManager();
  await assert.rejects(database.activateOfflineDatabase("A"), /SQLCipher is unavailable/);
  assert.equal(environment.files.has(environment.identity("A").fileName), false);
  assert.equal(environment.getOpenCount(), 0);
});

test("logout waits for database work and migration failure rolls back", async () => {
  const environment = makeEnvironment();
  environment.authenticate("A");
  let failMigration = true;
  environment.migrations.push({ version: 2, name: "test", up: async () => {
    if (failMigration) throw new Error("test migration failure");
  } });
  const database = environment.loadManager();
  await assert.rejects(database.activateOfflineDatabase("A"), /initialization failed/);
  const file = environment.files.get(environment.identity("A").fileName);
  assert.deepEqual(file.ledger, []);
  failMigration = false;
  await database.activateOfflineDatabase("A");
  assert.deepEqual(file.ledger, [1, 2]);

  let finishWork;
  let workStarted;
  const started = new Promise((resolve) => { workStarted = resolve; });
  const held = database.withOfflineDatabase("A", async () => {
    workStarted();
    await new Promise((resolve) => { finishWork = resolve; });
  });
  await started;
  const closing = database.closeOfflineDatabase();
  let closed = false;
  void closing.then(() => { closed = true; });
  await Promise.resolve();
  assert.equal(closed, false);
  finishWork();
  await Promise.all([held, closing]);
  await assert.rejects(database.withOfflineDatabase("A", async () => null), /No offline database/);
});
