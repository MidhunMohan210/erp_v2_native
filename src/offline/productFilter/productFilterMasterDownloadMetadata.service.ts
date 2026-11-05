import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";

import {
  migrateLegacyMasterDownloadStatus,
  readMasterDownloadStatus,
  saveMasterDownloadStatus,
} from "@/offline/downloads/masterDownloadStatus.service";

export type ProductFilterMetadata = {
  companyId: string;
  brandCount: number;
  categoryCount: number;
  subcategoryCount: number;
  completedAt: string;
};

function isValidMetadata(value: unknown, companyId: string): value is ProductFilterMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as ProductFilterMetadata;
  return (
    metadata.companyId === companyId &&
    Number.isInteger(metadata.brandCount) && metadata.brandCount >= 0 &&
    Number.isInteger(metadata.categoryCount) && metadata.categoryCount >= 0 &&
    Number.isInteger(metadata.subcategoryCount) && metadata.subcategoryCount >= 0 &&
    typeof metadata.completedAt === "string" &&
    !Number.isNaN(Date.parse(metadata.completedAt))
  );
}

export async function readProductFilterMetadata(
  userId: string,
  companyId: string,
): Promise<ProductFilterMetadata | null> {
  const saved = await readMasterDownloadStatus(userId, companyId, "productFilter");
  if (saved !== null) return isValidMetadata(saved, companyId) ? saved : null;

  const legacyKey = `offlineProductFilterMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy) return null;
  try {
    const metadata = JSON.parse(legacy) as unknown;
    if (!isValidMetadata(metadata, companyId)) return null;
    const migrated = await migrateLegacyMasterDownloadStatus(
      userId,
      companyId,
      "productFilter",
      metadata,
      [metadata.brandCount, metadata.categoryCount, metadata.subcategoryCount],
    );
    if (migrated) return metadata;
    const current = await readMasterDownloadStatus(userId, companyId, "productFilter");
    return isValidMetadata(current, companyId) ? current : null;
  } catch {
    return null;
  }
}

export function saveProductFilterMetadata(
  database: SQLiteDatabase,
  metadata: ProductFilterMetadata,
): Promise<void> {
  return saveMasterDownloadStatus(database, metadata.companyId, "productFilter", metadata);
}
