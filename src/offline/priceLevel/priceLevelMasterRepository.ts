import type { SQLiteDatabase } from "expo-sqlite";

export type OfflinePriceLevel = {
  _id: string;
  pricelevel: string;
};

type OfflinePriceLevelRow = {
  company_id: string;
  price_level_id: string;
  price_level_name: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toRow(companyId: string, priceLevel: OfflinePriceLevel): OfflinePriceLevelRow {
  if (
    !isNonEmptyString(companyId) ||
    !priceLevel ||
    typeof priceLevel !== "object" ||
    !isNonEmptyString(priceLevel._id) ||
    !isNonEmptyString(priceLevel.pricelevel)
  ) {
    throw new Error("Each offline Price Level needs an ID and name.");
  }

  return {
    company_id: companyId,
    price_level_id: priceLevel._id,
    price_level_name: priceLevel.pricelevel.trim(),
  };
}

function prepareRows(
  companyId: string,
  priceLevels: OfflinePriceLevel[],
): OfflinePriceLevelRow[] {
  const ids = new Set<string>();
  return priceLevels.map((priceLevel) => {
    const row = toRow(companyId, priceLevel);
    if (ids.has(row.price_level_id)) {
      throw new Error("The offline Price Level list contains duplicate Price Level IDs.");
    }
    ids.add(row.price_level_id);
    return row;
  });
}

/** Validates every row before deleting the selected company's prior snapshot. */
export function validateOfflinePriceLevels(
  companyId: string,
  priceLevels: OfflinePriceLevel[],
): void {
  prepareRows(companyId, priceLevels);
}

/** Replaces one company's complete Price Level snapshot in one transaction. */
export async function replaceOfflinePriceLevels(
  database: SQLiteDatabase,
  companyId: string,
  priceLevels: OfflinePriceLevel[],
  saveCompletion?: (database: SQLiteDatabase) => Promise<void>,
): Promise<void> {
  const rows = prepareRows(companyId, priceLevels);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "DELETE FROM offline_price_level WHERE company_id = ?",
      companyId,
    );
    for (const row of rows) {
      await database.runAsync(
        `INSERT INTO offline_price_level (
          company_id, price_level_id, price_level_name
        ) VALUES (?, ?, ?)`,
        row.company_id,
        row.price_level_id,
        row.price_level_name,
      );
    }
    if (saveCompletion) await saveCompletion(database);
  });
}

export async function listOfflinePriceLevels(
  database: SQLiteDatabase,
  companyId: string,
): Promise<OfflinePriceLevel[]> {
  const rows = await database.getAllAsync<OfflinePriceLevelRow>(
    `SELECT * FROM offline_price_level WHERE company_id = ?
     ORDER BY price_level_name COLLATE NOCASE, price_level_id`,
    companyId,
  );
  return rows.map((row) => ({
    _id: row.price_level_id,
    pricelevel: row.price_level_name,
  }));
}

export async function countOfflinePriceLevels(
  database: SQLiteDatabase,
  companyId: string,
): Promise<number> {
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM offline_price_level WHERE company_id = ?",
    companyId,
  );
  return Number(row?.count ?? 0);
}
