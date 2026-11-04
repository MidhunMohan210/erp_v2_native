import { withOfflineDatabase } from "@/offline/database/database";
import { downloadPriceLevelMaster } from "@/offline/downloads/priceLevelMasterDownload.service";

import {
  countOfflinePriceLevels,
  replaceOfflinePriceLevels,
  validateOfflinePriceLevels,
  type OfflinePriceLevel,
} from "./priceLevelMasterRepository";
import {
  readPriceLevelMasterDownloadMetadata,
  savePriceLevelMasterDownloadMetadata,
  type PriceLevelMasterDownloadMetadata,
} from "./priceLevelMasterDownloadMetadata.service";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type PriceLevelMasterDownloadStatus = {
  metadata: PriceLevelMasterDownloadMetadata | null;
  storedCount: number;
  isComplete: boolean;
};

/** Validates response fields and duplicate IDs before any SQLite replacement. */
export function validateDownloadedPriceLevels(
  priceLevels: OfflinePriceLevel[],
): void {
  validateOfflinePriceLevels("validation", priceLevels);
}

export async function importPriceLevelMaster(
  userId: string,
  companyId: string,
): Promise<PriceLevelMasterDownloadMetadata> {
  if (!isNonEmptyString(userId) || !isNonEmptyString(companyId)) {
    throw new Error("Sign in and select a company before downloading Price Levels.");
  }

  const priceLevels = await downloadPriceLevelMaster(companyId);
  validateDownloadedPriceLevels(priceLevels);
  await withOfflineDatabase(userId, (database) =>
    replaceOfflinePriceLevels(database, companyId, priceLevels),
  );

  const metadata: PriceLevelMasterDownloadMetadata = {
    companyId,
    priceLevelCount: priceLevels.length,
    completedAt: new Date().toISOString(),
  };
  await savePriceLevelMasterDownloadMetadata(userId, metadata);
  return metadata;
}

/** Completion means the receipt and selected company's SQLite count agree. */
export async function getPriceLevelMasterDownloadStatus(
  userId: string,
  companyId: string,
): Promise<PriceLevelMasterDownloadStatus> {
  const metadata = await readPriceLevelMasterDownloadMetadata(userId, companyId);
  if (!metadata) return { metadata: null, storedCount: 0, isComplete: false };

  const storedCount = await withOfflineDatabase(userId, (database) =>
    countOfflinePriceLevels(database, companyId),
  );
  return {
    metadata,
    storedCount,
    isComplete: storedCount === metadata.priceLevelCount,
  };
}
