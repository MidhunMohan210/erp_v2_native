import type { SQLiteDatabase } from "expo-sqlite";

/** Series numbers are saved for preview only; the backend issues final numbers. */
export const createOfflineVoucherSeries = {
  version: 5,
  name: "create_offline_voucher_series",
  async up(database: SQLiteDatabase): Promise<void> {
    await database.execAsync(`
      CREATE TABLE offline_voucher_series (
        company_id TEXT NOT NULL,
        voucher_type TEXT NOT NULL,
        series_id TEXT NOT NULL,
        series_name TEXT NOT NULL,
        prefix TEXT NOT NULL,
        suffix TEXT NOT NULL,
        current_number INTEGER NOT NULL,
        number_width INTEGER NOT NULL,
        is_default INTEGER NOT NULL,
        currently_selected INTEGER NOT NULL,
        PRIMARY KEY (company_id, voucher_type, series_id)
      )
    `);
    await database.execAsync(
      "CREATE INDEX offline_voucher_series_company_type_name_idx ON offline_voucher_series (company_id, voucher_type, series_name COLLATE NOCASE, series_id)",
    );
    await database.execAsync(
      "CREATE INDEX offline_voucher_series_company_type_default_idx ON offline_voucher_series (company_id, voucher_type, currently_selected, is_default)",
    );
  },
};
