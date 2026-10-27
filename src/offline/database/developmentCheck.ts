// Development-only SQLite test file. It runs when SQLite Foundation Check is
// pressed in Settings, never during app startup, and uses dummy rows only.
// It verifies that SQLite opens, migrations run once, and test data can be
// created, read, updated, deleted, and rolled back after a deliberate error.
import { initializeOfflineDatabase } from "./database";
import { migrations } from "./migrations";

type CheckRow = { value: string };
type CountRow = { count: number };

export type SQLiteCheckResult = {
  passed: string[];
  persistenceMarkerFound: boolean;
};

let checkPromise: Promise<SQLiteCheckResult> | null = null;

async function performCheck(): Promise<SQLiteCheckResult> {
  if (!__DEV__) throw new Error("SQLite development checks are disabled in release builds.");

  const passed: string[] = [];
  const [database, concurrentDatabase] = await Promise.all([
    initializeOfflineDatabase(),
    initializeOfflineDatabase(),
  ]);
  if (database !== concurrentDatabase) {
    throw new Error("Concurrent initialization opened different connections.");
  }
  passed.push("Open and concurrent initialization");

  // Reopening through our entry point must reuse the connection and must not
  // create another ledger entry for any completed migration.
  const before = await database.getFirstAsync<CountRow>(
    "SELECT COUNT(*) AS count FROM _offline_migrations",
  );
  const again = await initializeOfflineDatabase();
  const after = await database.getFirstAsync<CountRow>(
    "SELECT COUNT(*) AS count FROM _offline_migrations",
  );
  if (
    again !== database ||
    before?.count !== migrations.length ||
    after?.count !== before.count
  ) {
    throw new Error("Reinitialization repeated or lost a migration.");
  }
  passed.push("Migration runs once");

  // This table is only for manual development checks. No business data is used.
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS _offline_development_check (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  passed.push("Create test table");

  const persistenceMarker = await database.getFirstAsync<CheckRow>(
    "SELECT value FROM _offline_development_check WHERE id = ?",
    "persistence_marker",
  );
  const persistenceMarkerFound = persistenceMarker !== null;
  if (!persistenceMarkerFound) {
    // Keep one harmless marker so a manual run after app restart can find it.
    await database.runAsync(
      "INSERT INTO _offline_development_check (id, value) VALUES (?, ?)",
      "persistence_marker",
      new Date().toISOString(),
    );
  }

  const id = `crud_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await database.runAsync(
    "INSERT INTO _offline_development_check (id, value) VALUES (?, ?)",
    id,
    "created",
  );
  const inserted = await database.getFirstAsync<CheckRow>(
    "SELECT value FROM _offline_development_check WHERE id = ?",
    id,
  );
  if (inserted?.value !== "created") throw new Error("Insert/read check failed.");
  passed.push("Insert and read");

  await database.runAsync(
    "UPDATE _offline_development_check SET value = ? WHERE id = ?",
    "updated",
    id,
  );
  const updated = await database.getFirstAsync<CheckRow>(
    "SELECT value FROM _offline_development_check WHERE id = ?",
    id,
  );
  if (updated?.value !== "updated") throw new Error("Update check failed.");
  passed.push("Update");

  await database.runAsync("DELETE FROM _offline_development_check WHERE id = ?", id);
  const deleted = await database.getFirstAsync<CheckRow>(
    "SELECT value FROM _offline_development_check WHERE id = ?",
    id,
  );
  if (deleted !== null) throw new Error("Delete check failed.");
  passed.push("Delete");

  const rollbackId = `rollback_${id}`;
  const deliberateError = new Error("Deliberate rollback check");
  try {
    // Expo rolls this transaction back when the callback throws. Only this
    // test's row is involved; existing application data is never touched.
    await database.withTransactionAsync(async () => {
      await database.runAsync(
        "INSERT INTO _offline_development_check (id, value) VALUES (?, ?)",
        rollbackId,
        "must disappear",
      );
      throw deliberateError;
    });
  } catch (error) {
    if (error !== deliberateError) throw error;
  }
  const rolledBack = await database.getFirstAsync<CheckRow>(
    "SELECT value FROM _offline_development_check WHERE id = ?",
    rollbackId,
  );
  if (rolledBack !== null) throw new Error("Transaction rollback check failed.");
  passed.push("Transaction rollback");

  return { passed, persistenceMarkerFound };
}

/** Call from the development Settings row; simultaneous taps share one check. */
export function runSQLiteDevelopmentCheck(): Promise<SQLiteCheckResult> {
  if (!checkPromise) {
    checkPromise = performCheck().finally(() => {
      checkPromise = null;
    });
  }
  return checkPromise;
}
