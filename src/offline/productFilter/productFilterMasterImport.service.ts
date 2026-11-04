import { withOfflineDatabase } from "@/offline/database/database";
import { downloadProductFilters } from "@/offline/downloads/productFilterMasterDownload.service";

import {
  countOfflineProductFilters,
  replaceOfflineProductFilters,
  validateOfflineProductFilters,
} from "./productFilterMasterRepository";
import {
  readProductFilterMetadata,
  saveProductFilterMetadata,
  type ProductFilterMetadata,
} from "./productFilterMasterDownloadMetadata.service";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type ProductFilterCounts = {
  brand: number;
  category: number;
  subcategory: number;
};

export type ProductFilterStatus = {
  metadata: ProductFilterMetadata | null;
  counts: ProductFilterCounts;
  isComplete: boolean;
};

/** Downloads every type before the repository replaces this company's snapshot. */
export async function importProductFilterMaster(
  userId: string,
  companyId: string,
): Promise<ProductFilterMetadata> {
  if (!isNonEmptyString(userId) || !isNonEmptyString(companyId)) {
    throw new Error("Sign in and select a company before downloading Product Filters.");
  }

  const [brands, categories, subcategories] = await Promise.all([
    downloadProductFilters(companyId, "brand"),
    downloadProductFilters(companyId, "category"),
    downloadProductFilters(companyId, "subcategory"),
  ]);
  const filters = [...brands, ...categories, ...subcategories];
  validateOfflineProductFilters(companyId, filters);

  await withOfflineDatabase(userId, (database) =>
    replaceOfflineProductFilters(database, companyId, filters),
  );

  const metadata: ProductFilterMetadata = {
    companyId,
    brandCount: brands.length,
    categoryCount: categories.length,
    subcategoryCount: subcategories.length,
    completedAt: new Date().toISOString(),
  };
  await saveProductFilterMetadata(userId, metadata);
  return metadata;
}

/** Completion needs a saved receipt and matching counts for all three types. */
export async function getProductFilterMasterStatus(
  userId: string,
  companyId: string,
): Promise<ProductFilterStatus> {
  const metadata = await readProductFilterMetadata(userId, companyId);
  if (!metadata) {
    return {
      metadata: null,
      counts: { brand: 0, category: 0, subcategory: 0 },
      isComplete: false,
    };
  }

  const counts = await withOfflineDatabase(userId, async (database) => {
    const [brand, category, subcategory] = await Promise.all([
      countOfflineProductFilters(database, companyId, "brand"),
      countOfflineProductFilters(database, companyId, "category"),
      countOfflineProductFilters(database, companyId, "subcategory"),
    ]);
    return { brand, category, subcategory };
  });

  return {
    metadata,
    counts,
    isComplete:
      counts.brand === metadata.brandCount &&
      counts.category === metadata.categoryCount &&
      counts.subcategory === metadata.subcategoryCount,
  };
}
