import type { SQLiteDatabase } from "expo-sqlite";

export const createOfflineMasterDownloadStatus = {
  version: 8,
  name: "create_offline_master_download_status",
  async up(database: SQLiteDatabase): Promise<void> {
    await database.execAsync(`
      CREATE TABLE offline_master_download_status (
        company_id TEXT NOT NULL,
        master_key TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        PRIMARY KEY (company_id, master_key)
      )
    `);
  },
};
