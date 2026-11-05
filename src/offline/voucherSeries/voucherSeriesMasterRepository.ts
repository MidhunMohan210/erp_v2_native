import type { SQLiteDatabase } from "expo-sqlite";

export type OfflineVoucherSeriesType = "sale" | "saleOrder";

export type OfflineVoucherSeries = {
  _id: string;
  seriesName: string;
  prefix: string;
  suffix: string;
  currentNumber: number;
  widthOfNumericalPart: number;
  isDefault: boolean;
  currentlySelected: boolean;
  voucherType: OfflineVoucherSeriesType;
};

type OfflineVoucherSeriesRow = {
  company_id: string;
  voucher_type: OfflineVoucherSeriesType;
  series_id: string;
  series_name: string;
  prefix: string;
  suffix: string;
  current_number: number;
  number_width: number;
  is_default: number;
  currently_selected: number;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isVoucherType(value: unknown): value is OfflineVoucherSeriesType {
  return value === "sale" || value === "saleOrder";
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function toRow(companyId: string, series: OfflineVoucherSeries): OfflineVoucherSeriesRow {
  if (
    !isNonEmptyString(companyId) ||
    !series ||
    typeof series !== "object" ||
    !isVoucherType(series.voucherType) ||
    !isNonEmptyString(series._id) ||
    !isNonEmptyString(series.seriesName) ||
    typeof series.prefix !== "string" ||
    typeof series.suffix !== "string" ||
    !isPositiveInteger(series.currentNumber) ||
    !isPositiveInteger(series.widthOfNumericalPart) ||
    typeof series.isDefault !== "boolean" ||
    typeof series.currentlySelected !== "boolean"
  ) {
    throw new Error("Each offline Voucher Series needs valid identity and numbering fields.");
  }

  return {
    company_id: companyId,
    voucher_type: series.voucherType,
    series_id: series._id,
    series_name: series.seriesName.trim(),
    prefix: series.prefix,
    suffix: series.suffix,
    // This is a preview snapshot only. Never update it on the device.
    current_number: series.currentNumber,
    number_width: series.widthOfNumericalPart,
    is_default: series.isDefault ? 1 : 0,
    currently_selected: series.currentlySelected ? 1 : 0,
  };
}

function prepareRows(
  companyId: string,
  series: OfflineVoucherSeries[],
): OfflineVoucherSeriesRow[] {
  const ids = new Set<string>();
  return series.map((item) => {
    const row = toRow(companyId, item);
    if (ids.has(row.series_id)) {
      throw new Error("The offline Voucher Series list contains duplicate series IDs.");
    }
    ids.add(row.series_id);
    return row;
  });
}

/** Validates both voucher types before either existing snapshot is deleted. */
export function validateOfflineVoucherSeries(
  companyId: string,
  series: OfflineVoucherSeries[],
): void {
  prepareRows(companyId, series);
}

/** Replaces Sale and Sale Order series together in one SQLite transaction. */
export async function replaceOfflineVoucherSeries(
  database: SQLiteDatabase,
  companyId: string,
  series: OfflineVoucherSeries[],
  saveCompletion?: (database: SQLiteDatabase) => Promise<void>,
): Promise<void> {
  const rows = prepareRows(companyId, series);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "DELETE FROM offline_voucher_series WHERE company_id = ? AND voucher_type IN (?, ?)",
      companyId,
      "sale",
      "saleOrder",
    );
    for (const row of rows) {
      await database.runAsync(
        `INSERT INTO offline_voucher_series (
          company_id, voucher_type, series_id, series_name, prefix, suffix,
          current_number, number_width, is_default, currently_selected
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row.company_id,
        row.voucher_type,
        row.series_id,
        row.series_name,
        row.prefix,
        row.suffix,
        row.current_number,
        row.number_width,
        row.is_default,
        row.currently_selected,
      );
    }
    if (saveCompletion) await saveCompletion(database);
  });
}

export async function listOfflineVoucherSeries(
  database: SQLiteDatabase,
  companyId: string,
  voucherType: OfflineVoucherSeriesType,
): Promise<OfflineVoucherSeries[]> {
  const rows = await database.getAllAsync<OfflineVoucherSeriesRow>(
    `SELECT * FROM offline_voucher_series
     WHERE company_id = ? AND voucher_type = ?
     ORDER BY series_name COLLATE NOCASE, series_id`,
    companyId,
    voucherType,
  );
  return rows.map((row) => ({
    _id: row.series_id,
    seriesName: row.series_name,
    prefix: row.prefix,
    suffix: row.suffix,
    currentNumber: row.current_number,
    widthOfNumericalPart: row.number_width,
    isDefault: row.is_default === 1,
    currentlySelected: row.currently_selected === 1,
    voucherType: row.voucher_type,
  }));
}

export async function countOfflineVoucherSeries(
  database: SQLiteDatabase,
  companyId: string,
  voucherType: OfflineVoucherSeriesType,
): Promise<number> {
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM offline_voucher_series WHERE company_id = ? AND voucher_type = ?",
    companyId,
    voucherType,
  );
  return Number(row?.count ?? 0);
}
