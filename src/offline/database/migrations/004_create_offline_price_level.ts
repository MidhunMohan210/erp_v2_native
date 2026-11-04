import type { SQLiteDatabase } from "expo-sqlite";

/** Stores the selectable Price Level IDs and labels for one company. */
export const createOfflinePriceLevel = {
  version: 4,
  name: "create_offline_price_level",
  async up(database: SQLiteDatabase): Promise<void> {
    await database.execAsync(`
      CREATE TABLE offline_price_level (
        company_id TEXT NOT NULL,
        price_level_id TEXT NOT NULL,
        price_level_name TEXT NOT NULL,
        PRIMARY KEY (company_id, price_level_id)
      )
    `);
    await database.execAsync(
      "CREATE INDEX offline_price_level_company_name_idx ON offline_price_level (company_id, price_level_name COLLATE NOCASE, price_level_id)",
    );
  },
};
