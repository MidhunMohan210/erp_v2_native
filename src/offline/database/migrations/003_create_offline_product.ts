import type { SQLiteDatabase } from "expo-sqlite";

// Product JSON remains intact for future Sale flows; these columns only make
// company-scoped listing and master filtering efficient in SQLite.
export const createOfflineProduct = {
  version: 3,
  name: "create_offline_product",
  async up(database: SQLiteDatabase): Promise<void> {
    await database.execAsync(`
      CREATE TABLE offline_product (
        company_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        brand_id TEXT,
        category_id TEXT,
        sub_category_id TEXT,
        product_data TEXT NOT NULL,
        PRIMARY KEY (company_id, product_id)
      )
    `);
    await database.execAsync(
      "CREATE INDEX offline_product_company_name_idx ON offline_product (company_id, product_name COLLATE NOCASE, product_id)",
    );
    await database.execAsync(
      "CREATE INDEX offline_product_company_brand_idx ON offline_product (company_id, brand_id)",
    );
    await database.execAsync(
      "CREATE INDEX offline_product_company_category_idx ON offline_product (company_id, category_id, sub_category_id)",
    );
    await database.execAsync(
      "CREATE INDEX offline_product_company_sub_category_idx ON offline_product (company_id, sub_category_id)",
    );
  },
};
