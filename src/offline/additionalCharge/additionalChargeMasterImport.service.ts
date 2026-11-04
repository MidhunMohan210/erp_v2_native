import { withOfflineDatabase } from "@/offline/database/database";
import { downloadAdditionalChargeMaster } from "@/offline/downloads/additionalChargeMasterDownload.service";
import { countOfflineAdditionalCharges, replaceOfflineAdditionalCharges, validateOfflineAdditionalCharges } from "./additionalChargeMasterRepository";
import { readAdditionalChargeMasterDownloadMetadata, saveAdditionalChargeMasterDownloadMetadata, type AdditionalChargeMasterDownloadMetadata } from "./additionalChargeMasterDownloadMetadata.service";

function text(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
export type AdditionalChargeMasterDownloadStatus = { metadata: AdditionalChargeMasterDownloadMetadata | null; storedCount: number; isComplete: boolean };

export async function importAdditionalChargeMaster(userId: string, companyId: string): Promise<AdditionalChargeMasterDownloadMetadata> {
  if (!text(userId) || !text(companyId)) throw new Error("Sign in and select a company before downloading Additional Charges.");
  const charges = await downloadAdditionalChargeMaster(companyId);
  validateOfflineAdditionalCharges(companyId, charges);
  await withOfflineDatabase(userId, (database) => replaceOfflineAdditionalCharges(database, companyId, charges));
  const metadata = { companyId, chargeCount: charges.length, completedAt: new Date().toISOString() };
  await saveAdditionalChargeMasterDownloadMetadata(userId, metadata);
  return metadata;
}

/** A zero-row master is complete only when a saved receipt confirms it. */
export async function getAdditionalChargeMasterDownloadStatus(userId: string, companyId: string): Promise<AdditionalChargeMasterDownloadStatus> {
  const metadata = await readAdditionalChargeMasterDownloadMetadata(userId, companyId);
  if (!metadata) return { metadata: null, storedCount: 0, isComplete: false };
  const storedCount = await withOfflineDatabase(userId, (database) => countOfflineAdditionalCharges(database, companyId));
  return { metadata, storedCount, isComplete: storedCount === metadata.chargeCount };
}
