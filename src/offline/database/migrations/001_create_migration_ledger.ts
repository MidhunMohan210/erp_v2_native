// Creates the internal ledger used to record which database changes have run.
import type { SQLiteDatabase } from "expo-sqlite";

export const createMigrationLedger = {
  version: 1,
  name: "create_migration_ledger",
  async up(database: SQLiteDatabase): Promise<void> {
    // The version is a primary key, so the same migration cannot be recorded twice.
    await database.execAsync(`
      CREATE TABLE _offline_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },
};
