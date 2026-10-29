// Development-only SQLite test file. It runs when SQLite Foundation Check is
// pressed in Settings for the authenticated user, and uses dummy rows only.
// It verifies that SQLite opens, migrations run once, and test data can be
// created, read, updated, deleted, and rolled back after a deliberate error.
import { withOfflineDatabase } from "./database";
import { migrations } from "./migrations";

type CheckRow = { value: string };
type CountRow = { count: number };

export type SQLiteCheckResult = {
  passed: string[];
  persistenceMarkerFound: boolean;
};

let checkPromise: Promise<SQLiteCheckResult> | null = null;
let checkUserId: string | null = null;

async function performCheck(userId: string): Promise<SQLiteCheckResult> {
  if (!__DEV__) throw new Error("SQLite development checks are disabled in release builds.");

  // This callback holds the connection queue for the whole check. A logout or
  // account switch waits until its test transaction finishes before closing it.
  return withOfflineDatabase(userId, async (database) => {
    const passed: string[] = [];
    passed.push("Authenticated encrypted database ready");

    // Every migration should have exactly one ledger entry after login opens
    // the encrypted database. Login again to check reopening on the same file.
    const applied = await database.getFirstAsync<CountRow>(
      "SELECT COUNT(*) AS count FROM _offline_migrations",
    );
    if (applied?.count !== migrations.length) {
      throw new Error("The migration ledger does not match the app migrations.");
    }
    passed.push("Migration ledger complete");

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
  });
}

/** Call from the development Settings row; simultaneous taps share one check. */
export function runSQLiteDevelopmentCheck(userId: string): Promise<SQLiteCheckResult> {
  if (!checkPromise || checkUserId !== userId) {
    checkUserId = userId;
    checkPromise = performCheck(userId).finally(() => {
      if (checkUserId === userId) {
        checkPromise = null;
        checkUserId = null;
      }
    });
  }
  return checkPromise;
}
