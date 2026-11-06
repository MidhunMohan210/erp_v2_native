import type { SQLiteDatabase } from "expo-sqlite";

import type { Party } from "@/types/party";

export type OfflineParty = Party & {
  cmp_id: string;
  Primary_user_id?: string;
  Secondary_user_id?: string;
  priceLevel?: string;
  groupName?: string;
  childGroupName?: string;
  state_reference?: string;
  pincode?: string;
  party_master_id?: string;
  acholder_name?: string;
  swift_code?: string;
  upi_id?: string;
  bsr_code?: string;
  client_code?: string;
  lastUpdatedBySource?: string;
  tallyUserName?: string;
  created_by?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SavedOfflineParty = OfflineParty & { sync_status: "synced" | "pending" };

type OfflinePartyRow = SavedOfflineParty;

const columns = [
  "cmp_id", "_id", "Primary_user_id", "Secondary_user_id", "partyType", "accountGroup", "subGroup", "priceLevel", "groupName", "childGroupName", "openingBalanceAmount", "openingBalanceType", "partyName", "mobileNumber", "country", "state", "pin", "emailID", "gstNo", "panNo", "billingAddress", "shippingAddress", "creditPeriod", "creditLimit", "state_reference", "pincode", "party_master_id", "acholder_name", "ac_no", "ifsc", "swift_code", "bank_name", "branch", "upi_id", "bsr_code", "client_code", "source", "lastUpdatedBySource", "tallyUserName", "created_by", "createdAt", "updatedAt", "sync_status",
] as const;

function valueOrNull(value: unknown): string | number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "object" && value && "_id" in value) {
    const id = value._id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function partyValues(party: OfflineParty, syncStatus: "synced" | "pending") {
  return columns.map((column) => {
    if (column === "sync_status") return syncStatus;
    return valueOrNull(party[column as keyof OfflineParty]);
  });
}

const placeholders = columns.map(() => "?").join(", ");
const assignments = columns
  .filter((column) => column !== "cmp_id" && column !== "_id" && column !== "sync_status")
  .map((column) => `${column} = excluded.${column}`)
  .join(", ");

const insertSql = `
  INSERT INTO offline_party (${columns.join(", ")}) VALUES (${placeholders})
  ON CONFLICT(cmp_id, _id) DO UPDATE SET ${assignments}, sync_status = 'synced'
  WHERE offline_party.sync_status = 'synced'
`;

/** Replaces only server-downloaded rows, leaving pending device rows intact. */
export async function replaceDownloadedParties(
  database: SQLiteDatabase,
  cmpId: string,
  parties: OfflineParty[],
  saveCompletion?: (database: SQLiteDatabase) => Promise<void>,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "DELETE FROM offline_party WHERE cmp_id = ? AND sync_status = 'synced'",
      cmpId,
    );
    for (const party of parties) {
      await database.runAsync(insertSql, ...partyValues(party, "synced"));
    }
    if (saveCompletion) await saveCompletion(database);
  });
}

/** Reads one company's saved rows with local search for the Offline master list. */
export async function readSavedParties(
  database: SQLiteDatabase,
  cmpId: string,
  search = "",
): Promise<SavedOfflineParty[]> {
  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    const searchValue = `%${trimmedSearch}%`;
    return database.getAllAsync<OfflinePartyRow>(
      `SELECT * FROM offline_party
       WHERE cmp_id = ?
         AND (
           partyName LIKE ? COLLATE NOCASE OR
           mobileNumber LIKE ? COLLATE NOCASE OR
           emailID LIKE ? COLLATE NOCASE
         )
       ORDER BY partyName COLLATE NOCASE, _id`,
      cmpId,
      searchValue,
      searchValue,
      searchValue,
    );
  }

  return database.getAllAsync<OfflinePartyRow>(
    "SELECT * FROM offline_party WHERE cmp_id = ? ORDER BY partyName COLLATE NOCASE, _id",
    cmpId,
  );
}

/** Counts only the server snapshot; pending device Parties are kept separately. */
export async function countDownloadedParties(
  database: SQLiteDatabase,
  cmpId: string,
): Promise<number> {
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM offline_party WHERE cmp_id = ? AND sync_status = 'synced'",
    cmpId,
  );
  return result?.count ?? 0;
}
