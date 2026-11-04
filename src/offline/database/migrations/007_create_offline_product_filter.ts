import type { SQLiteDatabase } from "expo-sqlite";

export const createOfflineProductFilter = {
  version: 7,
  name: "create_offline_product_filter",
  async up(database: SQLiteDatabase): Promise<void> {
    await database.execAsync(`
      CREATE TABLE offline_product_filter (
        company_id TEXT NOT NULL,
        filter_type TEXT NOT NULL,
        filter_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category_id TEXT,
        PRIMARY KEY (company_id, filter_type, filter_id)
      )
    `);
    await database.execAsync(
      "CREATE INDEX offline_product_filter_company_type_name_idx ON offline_product_filter (company_id, filter_type, name COLLATE NOCASE, filter_id)",
    );
    await database.execAsync(
      "CREATE INDEX offline_product_filter_company_type_category_idx ON offline_product_filter (company_id, filter_type, category_id)",
    );
  },
};
