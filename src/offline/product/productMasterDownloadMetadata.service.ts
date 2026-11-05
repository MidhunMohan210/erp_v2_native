import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";

import {
  migrateLegacyMasterDownloadStatus,
  readMasterDownloadStatus,
  saveMasterDownloadStatus,
} from "@/offline/downloads/masterDownloadStatus.service";

export type ProductMasterDownloadMetadata = {
  companyId: string;
  productCount: number;
  completedAt: string;
};

function isValidMetadata(value: unknown, companyId: string): value is ProductMasterDownloadMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as ProductMasterDownloadMetadata;
  return (
    metadata.companyId === companyId &&
    Number.isInteger(metadata.productCount) && metadata.productCount >= 0 &&
    typeof metadata.completedAt === "string" &&
    !Number.isNaN(Date.parse(metadata.completedAt))
  );
}

export async function readProductMasterDownloadMetadata(
  userId: string,
  companyId: string,
): Promise<ProductMasterDownloadMetadata | null> {
  const saved = await readMasterDownloadStatus(userId, companyId, "product");
  if (saved !== null) return isValidMetadata(saved, companyId) ? saved : null;

  const legacyKey = `offlineProductMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy) return null;
  try {
    const metadata = JSON.parse(legacy) as unknown;
    if (!isValidMetadata(metadata, companyId)) return null;
    const migrated = await migrateLegacyMasterDownloadStatus(
      userId,
      companyId,
      "product",
      metadata,
      [metadata.productCount],
    );
    if (migrated) return metadata;
    const current = await readMasterDownloadStatus(userId, companyId, "product");
    return isValidMetadata(current, companyId) ? current : null;
  } catch {
    return null;
  }
}

export function saveProductMasterDownloadMetadata(
  database: SQLiteDatabase,
  metadata: ProductMasterDownloadMetadata,
): Promise<void> {
  return saveMasterDownloadStatus(database, metadata.companyId, "product", metadata);
}
