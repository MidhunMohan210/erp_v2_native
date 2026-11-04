import type { SQLiteDatabase } from "expo-sqlite";

export type FilterType = "brand" | "category" | "subcategory";

export type OfflineProductFilter = {
  _id: string;
  name: string;
  filterType: FilterType;
  categoryId?: string | null;
};

type ProductFilterRow = {
  company_id: string;
  filter_type: FilterType;
  filter_id: string;
  name: string;
  category_id: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFilterType(value: unknown): value is FilterType {
  return value === "brand" || value === "category" || value === "subcategory";
}

function toRow(companyId: string, filter: OfflineProductFilter): ProductFilterRow {
  const hasInvalidRelationship =
    (filter.filterType === "subcategory" && !isNonEmptyString(filter.categoryId)) ||
    (filter.filterType !== "subcategory" && filter.categoryId != null);

  if (
    !isNonEmptyString(companyId) ||
    !filter ||
    !isNonEmptyString(filter._id) ||
    !isNonEmptyString(filter.name) ||
    !isFilterType(filter.filterType) ||
    hasInvalidRelationship
  ) {
    throw new Error(
      "Each offline Product Filter needs valid identity and relationship fields.",
    );
  }

  return {
    company_id: companyId,
    filter_type: filter.filterType,
    filter_id: filter._id.trim(),
    name: filter.name.trim(),
    category_id: filter.categoryId?.trim() ?? null,
  };
}

function prepareRows(companyId: string, filters: OfflineProductFilter[]): ProductFilterRow[] {
  const ids = new Set<string>();
  const rows = filters.map((filter) => {
    const row = toRow(companyId, filter);
    if (ids.has(row.filter_id)) {
      throw new Error("The offline Product Filter list contains duplicate IDs.");
    }
    ids.add(row.filter_id);
    return row;
  });

  const categoryIds = new Set(
    rows
      .filter((row) => row.filter_type === "category")
      .map((row) => row.filter_id),
  );
  if (
    rows.some(
      (row) =>
        row.filter_type === "subcategory" &&
        !categoryIds.has(row.category_id ?? ""),
    )
  ) {
    throw new Error("Each offline Subcategory must reference a downloaded Category.");
  }

  return rows;
}

export function validateOfflineProductFilters(
  companyId: string,
  filters: OfflineProductFilter[],
): void {
  prepareRows(companyId, filters);
}

/** Validates all three types before deleting the old company snapshot. */
export async function replaceOfflineProductFilters(
  database: SQLiteDatabase,
  companyId: string,
  filters: OfflineProductFilter[],
): Promise<void> {
  const rows = prepareRows(companyId, filters);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "DELETE FROM offline_product_filter WHERE company_id = ?",
      companyId,
    );
    for (const row of rows) {
      await database.runAsync(
        `INSERT INTO offline_product_filter
          (company_id, filter_type, filter_id, name, category_id)
         VALUES (?, ?, ?, ?, ?)`,
        row.company_id,
        row.filter_type,
        row.filter_id,
        row.name,
        row.category_id,
      );
    }
  });
}

export async function listOfflineProductFilters(
  database: SQLiteDatabase,
  companyId: string,
  filterType: FilterType,
): Promise<OfflineProductFilter[]> {
  const rows = await database.getAllAsync<ProductFilterRow>(
    `SELECT * FROM offline_product_filter
     WHERE company_id = ? AND filter_type = ?
     ORDER BY name COLLATE NOCASE, filter_id`,
    companyId,
    filterType,
  );
  return rows.map((row) => ({
    _id: row.filter_id,
    name: row.name,
    filterType: row.filter_type,
    categoryId: row.category_id,
  }));
}

export async function countOfflineProductFilters(
  database: SQLiteDatabase,
  companyId: string,
  filterType: FilterType,
): Promise<number> {
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM offline_product_filter WHERE company_id = ? AND filter_type = ?",
    companyId,
    filterType,
  );
  return Number(row?.count ?? 0);
}
