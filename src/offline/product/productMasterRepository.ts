import type { SQLiteDatabase } from "expo-sqlite";

import type { Product } from "@/types/product";

export type OfflineProduct = Product & {
  _id: string;
  cmp_id: string;
};

export type OfflineProductFilters = {
  brandId?: string;
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
};

type OfflineProductRow = {
  company_id: string;
  product_id: string;
  product_name: string;
  brand_id: string | null;
  category_id: string | null;
  sub_category_id: string | null;
  product_data: string;
};

function getReferenceId(
  value: Product["brand"] | Product["category"] | Product["sub_category"],
): string | null {
  if (typeof value === "string") return value;
  return value?._id ?? null;
}

function getProductName(product: Product): string {
  return product.product_name ?? product.name ?? "";
}

function toRow(companyId: string, product: OfflineProduct): OfflineProductRow {
  const productName = getProductName(product).trim();
  if (!product._id?.trim() || !productName || product.cmp_id !== companyId) {
    throw new Error(
      "Each offline Product needs an ID, product name, and matching company.",
    );
  }

  let productData: string;
  try {
    // JSON is the source of truth so nested pricing and stock rows are not lost.
    productData = JSON.stringify(product);
    const reconstructed = JSON.parse(productData) as OfflineProduct;
    if (
      reconstructed?._id !== product._id ||
      reconstructed?.cmp_id !== companyId
    ) {
      throw new Error("The offline Product JSON does not preserve its identity.");
    }
  } catch {
    throw new Error("The offline Product data could not be serialized.");
  }

  return {
    company_id: companyId,
    product_id: product._id,
    product_name: productName,
    brand_id: getReferenceId(product.brand),
    category_id: getReferenceId(product.category),
    sub_category_id: getReferenceId(product.sub_category),
    product_data: productData,
  };
}

function parseProduct(row: OfflineProductRow): OfflineProduct {
  try {
    const product = JSON.parse(row.product_data) as OfflineProduct;
    if (
      !product ||
      typeof product !== "object" ||
      product._id !== row.product_id ||
      product.cmp_id !== row.company_id ||
      !getProductName(product).trim()
    ) {
      throw new Error("Product identity does not match its SQLite row.");
    }
    return product;
  } catch {
    throw new Error(`Saved Product ${row.product_id} contains invalid JSON.`);
  }
}

function prepareRows(
  products: OfflineProduct[],
  companyId: string,
): OfflineProductRow[] {
  if (!companyId.trim()) {
    throw new Error("A company is required for offline Products.");
  }

  const ids = new Set<string>();
  return products.map((product) => {
    const row = toRow(companyId, product);
    if (ids.has(row.product_id)) {
      throw new Error("The offline Product list contains duplicate Product IDs.");
    }
    ids.add(row.product_id);
    return row;
  });
}

/** Validates every row before deleting this company's previous snapshot. */
export function validateOfflineProducts(
  products: OfflineProduct[],
  companyId: string,
): void {
  prepareRows(products, companyId);
}

/** Replaces one company's complete Product snapshot in a single transaction. */
export async function replaceOfflineProducts(
  database: SQLiteDatabase,
  companyId: string,
  products: OfflineProduct[],
  saveCompletion?: (database: SQLiteDatabase) => Promise<void>,
): Promise<void> {
  // Prepare once so the exact JSON validated before deletion is what SQLite stores.
  const rows = prepareRows(products, companyId);

  await database.withTransactionAsync(async () => {
    await database.runAsync("DELETE FROM offline_product WHERE company_id = ?", companyId);
    for (const row of rows) {
      await database.runAsync(
        `INSERT INTO offline_product (
          company_id, product_id, product_name, brand_id, category_id,
          sub_category_id, product_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        row.company_id,
        row.product_id,
        row.product_name,
        row.brand_id,
        row.category_id,
        row.sub_category_id,
        row.product_data,
      );
    }
    if (saveCompletion) await saveCompletion(database);
  });
}

export async function listOfflineProducts(
  database: SQLiteDatabase,
  companyId: string,
  filters: OfflineProductFilters = {},
): Promise<OfflineProduct[]> {
  const clauses = ["company_id = ?"];
  const values: string[] = [companyId];
  if (filters.brandId) {
    clauses.push("brand_id = ?");
    values.push(filters.brandId);
  }
  if (filters.categoryId) {
    clauses.push("category_id = ?");
    values.push(filters.categoryId);
  }
  if (filters.subCategoryId) {
    clauses.push("sub_category_id = ?");
    values.push(filters.subCategoryId);
  }
  if (filters.search?.trim()) {
    clauses.push("product_name LIKE ? COLLATE NOCASE");
    values.push(`%${filters.search.trim()}%`);
  }

  const rows = await database.getAllAsync<OfflineProductRow>(
    `SELECT * FROM offline_product WHERE ${clauses.join(" AND ")}
     ORDER BY product_name COLLATE NOCASE, product_id`,
    ...values,
  );
  return rows.map(parseProduct);
}

export async function getOfflineProduct(
  database: SQLiteDatabase,
  companyId: string,
  productId: string,
): Promise<OfflineProduct | null> {
  const row = await database.getFirstAsync<OfflineProductRow>(
    "SELECT * FROM offline_product WHERE company_id = ? AND product_id = ?",
    companyId,
    productId,
  );
  return row ? parseProduct(row) : null;
}

export async function countOfflineProducts(
  database: SQLiteDatabase,
  companyId: string,
): Promise<number> {
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM offline_product WHERE company_id = ?",
    companyId,
  );
  return Number(row?.count ?? 0);
}
