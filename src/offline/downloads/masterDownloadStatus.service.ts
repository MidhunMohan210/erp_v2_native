import type { SQLiteDatabase } from "expo-sqlite";

import { withOfflineDatabase } from "@/offline/database/database";

export type MasterDownloadKey =
  | "party"
  | "product"
  | "priceLevel"
  | "voucherSeries"
  | "additionalCharge"
  | "productFilter";

type StatusRow = { metadata_json: string };
type CountRow = { count: number };

const countQueries: Record<MasterDownloadKey, string[]> = {
  party: ["SELECT COUNT(*) AS count FROM offline_party WHERE cmp_id = ? AND sync_status = 'synced'"],
  product: ["SELECT COUNT(*) AS count FROM offline_product WHERE company_id = ?"],
  priceLevel: ["SELECT COUNT(*) AS count FROM offline_price_level WHERE company_id = ?"],
  voucherSeries: [
    "SELECT COUNT(*) AS count FROM offline_voucher_series WHERE company_id = ? AND voucher_type = 'sale'",
    "SELECT COUNT(*) AS count FROM offline_voucher_series WHERE company_id = ? AND voucher_type = 'saleOrder'",
    "SELECT COUNT(*) AS count FROM offline_voucher_series WHERE company_id = ? AND voucher_type = 'receipt'",
  ],
  additionalCharge: ["SELECT COUNT(*) AS count FROM offline_additional_charge WHERE company_id = ?"],
  productFilter: [
    "SELECT COUNT(*) AS count FROM offline_product_filter WHERE company_id = ? AND filter_type = 'brand'",
    "SELECT COUNT(*) AS count FROM offline_product_filter WHERE company_id = ? AND filter_type = 'category'",
    "SELECT COUNT(*) AS count FROM offline_product_filter WHERE company_id = ? AND filter_type = 'subcategory'",
  ],
};

export async function readMasterDownloadStatus(
  userId: string,
  companyId: string,
  masterKey: MasterDownloadKey,
): Promise<unknown | null> {
  return withOfflineDatabase(userId, async (database) => {
    const row = await database.getFirstAsync<StatusRow>(
      "SELECT metadata_json FROM offline_master_download_status WHERE company_id = ? AND master_key = ?",
      companyId,
      masterKey,
    );
    if (!row) return null;
    try {
      return JSON.parse(row.metadata_json) as unknown;
    } catch {
      return null;
    }
  });
}

/** Call inside the same transaction that replaces the master's rows. */
export async function saveMasterDownloadStatus(
  database: SQLiteDatabase,
  companyId: string,
  masterKey: MasterDownloadKey,
  metadata: object,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO offline_master_download_status (company_id, master_key, metadata_json)
     VALUES (?, ?, ?)
     ON CONFLICT(company_id, master_key) DO UPDATE SET metadata_json = excluded.metadata_json`,
    companyId,
    masterKey,
    JSON.stringify(metadata),
  );
}

/** A legacy receipt is trusted only when every corresponding SQLite count matches. */
export function migrateLegacyMasterDownloadStatus(
  userId: string,
  companyId: string,
  masterKey: MasterDownloadKey,
  metadata: object,
  expectedCounts: number[],
): Promise<boolean> {
  return withOfflineDatabase(userId, async (database) => {
    let migrated = false;
    await database.withTransactionAsync(async () => {
      const existing = await database.getFirstAsync<StatusRow>(
        "SELECT metadata_json FROM offline_master_download_status WHERE company_id = ? AND master_key = ?",
        companyId,
        masterKey,
      );
      if (existing) return;
      const queries = countQueries[masterKey];
      if (expectedCounts.length !== queries.length) return;
      for (let index = 0; index < queries.length; index += 1) {
        const row = await database.getFirstAsync<CountRow>(queries[index], companyId);
        if (Number(row?.count ?? 0) !== expectedCounts[index]) return;
      }
      await saveMasterDownloadStatus(database, companyId, masterKey, metadata);
      migrated = true;
    });
    return migrated;
  });
}
