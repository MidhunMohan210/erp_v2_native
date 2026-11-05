import { withMasterDownloadGuard, type MasterDownloadGuard } from "@/offline/downloads/masterDownloadGuard.service";
import { withOfflineDatabase } from "@/offline/database/database";
import {
  countOfflineProducts,
  replaceOfflineProducts,
  type OfflineProduct,
} from "@/offline/product/productMasterRepository";
import {
  readProductMasterDownloadMetadata,
  saveProductMasterDownloadMetadata,
  type ProductMasterDownloadMetadata,
} from "@/offline/product/productMasterDownloadMetadata.service";
import {
  downloadProductMaster,
  type ProductMasterDownloadProgress,
} from "@/offline/downloads/productMasterDownload.service";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

function hasReferenceId(value: unknown): boolean {
  return isNonEmptyString(value) || (
    typeof value === "object" &&
    value !== null &&
    "_id" in value &&
    isNonEmptyString(value._id)
  );
}

function isOptionalDate(value: unknown): boolean {
  return value === undefined || value === null || isNonEmptyString(value);
}

/** Validates the Product fields that the offline Sale and Sale Order pickers read. */

//Product _id, cmp_id, and product_name
// Base unit, alternate unit and conversions
// HSN and tax fields
// priceLevels[] IDs, rates, and discounts
// GodownList[] stock-row IDs, godown IDs, balances, batches, dates, and MRP
// Duplicate Product IDs
export function validateDownloadedProducts(
  products: OfflineProduct[],
  companyId: string,
): void {
  const ids = new Set<string>();
  for (const product of products) {
    const hasAlternateUnit = isNonEmptyString(product.alt_unit);
    const validConversions = hasAlternateUnit
      ? isFiniteNumber(product.base_denominator) && product.base_denominator > 0 &&
        isFiniteNumber(product.alt_conversion) && product.alt_conversion > 0
      : product.base_denominator == null && product.alt_conversion == null;
    const validTaxes = [
      product.cgst,
      product.sgst,
      product.igst,
    ].every(isFiniteNumber);
    const validOptionalTaxes = [
      product.cess,
      product.addl_cess,
      product.state_cess,
    ].every(isOptionalFiniteNumber);

    if (
      !isNonEmptyString(product._id) ||
      product.cmp_id !== companyId ||
      !isNonEmptyString(product.product_name) ||
      !isNonEmptyString(product.base_unit) ||
      !isNonEmptyString(product.hsn_code) ||
      !validConversions ||
      !validTaxes ||
      !validOptionalTaxes ||
      !Array.isArray(product.priceLevels) ||
      !Array.isArray(product.GodownList)
    ) {
      throw new Error("The Product master download contains an invalid Product.");
    }
    if (ids.has(product._id)) {
      throw new Error("The Product master download contains duplicate Product IDs.");
    }
    ids.add(product._id);

    for (const priceLevel of product.priceLevels) {
      if (
        !hasReferenceId(priceLevel.priceLevel) ||
        !isFiniteNumber(priceLevel.priceRate) ||
        (priceLevel.priceDisc !== undefined && !isFiniteNumber(priceLevel.priceDisc))
      ) {
        throw new Error("The Product master download contains an invalid Price Level.");
      }
    }

    for (const stockRow of product.GodownList) {
      if (
        !isNonEmptyString(stockRow._id) ||
        !hasReferenceId(stockRow.godown) ||
        !isFiniteNumber(stockRow.balance_stock) ||
        (stockRow.batch !== undefined && stockRow.batch !== null && typeof stockRow.batch !== "string") ||
        !isOptionalDate(stockRow.mfgdt) ||
        !isOptionalDate(stockRow.expdt) ||
        (stockRow.mrp !== undefined && stockRow.mrp !== null && !isFiniteNumber(stockRow.mrp))
      ) {
        throw new Error("The Product master download contains an invalid stock row.");
      }
    }
  }
}

export type ProductMasterDownloadStatus = {
  metadata: ProductMasterDownloadMetadata | null;
  storedCount: number;
  isComplete: boolean;
};


// starting point for the Product master download and import process.
//Downloads all Product API pages.
// Validates every Product before touching SQLite.
// Replaces the company’s old Product snapshot in one transaction.
// Saves completion metadata in the same SQLite transaction as the rows.
// Returns the downloaded count and completion time.

export async function importProductMaster(
  userId: string,
  companyId: string,
  onProgress?: (progress: ProductMasterDownloadProgress) => void,
  existingGuard?: MasterDownloadGuard,
  onSaving?: () => void,
): Promise<ProductMasterDownloadMetadata> {
  if (!isNonEmptyString(userId) || !isNonEmptyString(companyId)) {
    throw new Error("Sign in and select a company before downloading Products.");
  }

  return withMasterDownloadGuard(userId, companyId, async (guard) => {
    const products = await downloadProductMaster(companyId, (progress) => {
      guard.assertCurrent();
      onProgress?.(progress);
    });
    guard.assertCurrent();
    onSaving?.();
    validateDownloadedProducts(products, companyId);
    const metadata: ProductMasterDownloadMetadata = {
      companyId,
      productCount: products.length,
      completedAt: new Date().toISOString(),
    };
    guard.assertCurrent();
    await withOfflineDatabase(userId, (database) => {
      guard.assertCurrent();
      return replaceOfflineProducts(database, companyId, products, async (transaction) => {
        guard.assertCurrent();
        await saveProductMasterDownloadMetadata(transaction, metadata);
        guard.assertCurrent();
      });
    });
    return metadata;
  }, existingGuard);
}

/** Completion requires both a marker and the matching company-scoped SQLite count. */
export async function getProductMasterDownloadStatus(
  userId: string,
  companyId: string,
): Promise<ProductMasterDownloadStatus> {
  const metadata = await readProductMasterDownloadMetadata(userId, companyId);
  if (!metadata) return { metadata: null, storedCount: 0, isComplete: false };

  const storedCount = await withOfflineDatabase(userId, (database) =>
    countOfflineProducts(database, companyId),
  );
  return {
    metadata,
    storedCount,
    isComplete: storedCount === metadata.productCount,
  };
}
