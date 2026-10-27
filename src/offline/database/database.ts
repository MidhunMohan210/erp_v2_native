// Opens the app's one offline SQLite database and applies schema migrations.
import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";

import { migrations } from "./migrations";

const DATABASE_NAME = "erp_v2_offline.db";

type AppliedMigration = { version: number };
type JournalMode = { journal_mode: string };
type ForeignKeysSetting = { foreign_keys: number };

//Think of this variable as a saved record of the connection being prepared.
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

// applyMigrations()
//     ↓
// Checks which migrations have already run
//     ↓
// Runs the missing migrations
//     ↓
// Records them in _offline_migrations

async function applyMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // This connection is not shared until initialization finishes. One transaction
  // keeps both schema changes and their ledger entries together on failure.
  await database.withTransactionAsync(async () => {
    // sqlite_master is SQLite's catalogue. It stores information about the tables that exist in the database. Check it before querying the ledger
    // because the first launch has no ledger table yet.
    const ledger = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_offline_migrations'",
    );

    //Does _offline_migrations table exist?
    // Yes → Read all completed migration versions from it.
    // No  → Use an empty list: []
    //[{ version: 1 }] or [] if the table does not exist yet,That empty list tells the code: “No migration has run on this phone yet.”
    const applied = ledger
      ? await database.getAllAsync<AppliedMigration>(
          "SELECT version FROM _offline_migrations ORDER BY version",
        )
      : [];

    // Compare the migration list in app code with the migration history(in database) saved
    // on this phone. For example: app code [1, 2, 3], phone history [1, 2].
    // That is valid because this phone still needs migration 3.
    for (let index = 0; index < applied.length; index += 1) {
      if (migrations[index]?.version !== applied[index].version) {
        throw new Error(
          `Unknown or out-of-order migration: ${applied[index].version}`,
        );
      }
    }

    // Start after the migrations already recorded on this phone. For example:
    // app code [1, 2, 3], phone history [1] means start at index 1, then run
    // migration 2 followed by migration 3. Migration 1 is skipped.
    for (let index = applied.length; index < migrations.length; index += 1) {
      const migration = migrations[index];
      // Each migration must have a higher version than the previous one so
      // SQLite always applies database changes in the intended order.
      if (index > 0 && migration.version <= migrations[index - 1].version) {
        throw new Error(
          `Migration versions must increase: ${migration.version}`,
        );
      }

      //  1. Run ALTER TABLE
      // 2. Save migration history

      await migration.up(database);
      await database.runAsync(
        "INSERT INTO _offline_migrations (version, name) VALUES (?, ?)",
        migration.version,
        migration.name,
      );
    }
  });
}

async function openAndInitialize(): Promise<SQLite.SQLiteDatabase> {
  let database: SQLite.SQLiteDatabase | null = null;

  try {
    if (Platform.OS !== "android" && Platform.OS !== "ios") {
      throw new Error(
        "The offline database currently supports Android and iOS only.",
      );
    }

    // Think of it as similar to connecting your Node.js app to MongoDB. Here, SQLite opens a file on the phone. If the file doesn’t exist yet, SQLite creates it.
    database = await SQLite.openDatabaseAsync(DATABASE_NAME);

    //PRAGMA is a command for talking to SQLite about its settings.
    //SQLite needs a way to avoid leaving half-saved data. It uses an extra file called a journal to help it recover.
    // Journal mode simply means: which method should SQLite use for that extra file?
    // Our app chooses a method called WAL. SQLite manages it automatically.
    //WAL is a SQLite setting that helps reads and writes work smoothly together.
    const journal = await database.getFirstAsync<JournalMode>(
      "PRAGMA journal_mode = WAL",
    );
    if (journal?.journal_mode.toLowerCase() !== "wal") {
      throw new Error("SQLite could not enable WAL journal mode.");
    }

    // Let SQLite check that linked records exist when a table defines a foreign key. else reject it
    await database.execAsync("PRAGMA foreign_keys = ON");
    const foreignKeys = await database.getFirstAsync<ForeignKeysSetting>(
      "PRAGMA foreign_keys",
    );
    if (foreignKeys?.foreign_keys !== 1) {
      throw new Error("SQLite could not enable foreign-key checks.");
    }
    //A migration is a numbered instruction that changes the database structure.
    await applyMigrations(database);
    return database;
  } catch (error) {
    if (database) {
      try {
        await database.closeAsync();
      } catch (closeError) {
        console.error(
          "Could not close the failed offline database connection",
          closeError,
        );
      }
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Offline database initialization failed: ${reason}`);
  }
}

/// start here
// The first time it’s called, the function opens and prepares the database. Later calls get the same connection.
export function initializeOfflineDatabase(): Promise<SQLite.SQLiteDatabase> {
  //If a connection is already being prepared—or is ready—the function returns it.
  if (databasePromise) return databasePromise;

  //- If this is the first call, the function starts preparing the database and saves the promise in databasePromise.
  databasePromise = openAndInitialize().catch((error) => {
    databasePromise = null; // A later explicit call may retry initialization.
    throw error;
  });

  return databasePromise;
}
