import type { SQLiteDatabase } from "expo-sqlite";

export const createOfflineAdditionalCharge = {
  version: 6,
  name: "create_offline_additional_charge",
  async up(database: SQLiteDatabase): Promise<void> {
    await database.execAsync(`
      CREATE TABLE offline_additional_charge (
        company_id TEXT NOT NULL,
        charge_id TEXT NOT NULL,
        name TEXT NOT NULL,
        hsn TEXT,
        igst REAL NOT NULL DEFAULT 0,
        cgst REAL NOT NULL DEFAULT 0,
        sgst REAL NOT NULL DEFAULT 0,
        cess REAL NOT NULL DEFAULT 0,
        addl_cess REAL NOT NULL DEFAULT 0,
        state_cess REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (company_id, charge_id)
      )
    `);
    await database.execAsync(
      "CREATE INDEX offline_additional_charge_company_name_idx ON offline_additional_charge (company_id, name COLLATE NOCASE, charge_id)",
    );
  },
};
