import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";

import {
  migrateLegacyMasterDownloadStatus,
  readMasterDownloadStatus,
  saveMasterDownloadStatus,
} from "@/offline/downloads/masterDownloadStatus.service";

export type PriceLevelMasterDownloadMetadata = {
  companyId: string;
  priceLevelCount: number;
  completedAt: string;
};

function isValidMetadata(value: unknown, companyId: string): value is PriceLevelMasterDownloadMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as PriceLevelMasterDownloadMetadata;
  return (
    metadata.companyId === companyId &&
    Number.isInteger(metadata.priceLevelCount) && metadata.priceLevelCount >= 0 &&
    typeof metadata.completedAt === "string" &&
    !Number.isNaN(Date.parse(metadata.completedAt))
  );
}

export async function readPriceLevelMasterDownloadMetadata(
  userId: string,
  companyId: string,
): Promise<PriceLevelMasterDownloadMetadata | null> {
  const saved = await readMasterDownloadStatus(userId, companyId, "priceLevel");
  if (saved !== null) return isValidMetadata(saved, companyId) ? saved : null;

  const legacyKey = `offlinePriceLevelMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy) return null;
  try {
    const metadata = JSON.parse(legacy) as unknown;
    if (!isValidMetadata(metadata, companyId)) return null;
    const migrated = await migrateLegacyMasterDownloadStatus(
      userId,
      companyId,
      "priceLevel",
      metadata,
      [metadata.priceLevelCount],
    );
    if (migrated) return metadata;
    const current = await readMasterDownloadStatus(userId, companyId, "priceLevel");
    return isValidMetadata(current, companyId) ? current : null;
  } catch {
    return null;
  }
}

export function savePriceLevelMasterDownloadMetadata(
  database: SQLiteDatabase,
  metadata: PriceLevelMasterDownloadMetadata,
): Promise<void> {
  return saveMasterDownloadStatus(database, metadata.companyId, "priceLevel", metadata);
}
