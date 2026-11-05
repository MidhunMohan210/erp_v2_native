import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";

import {
  migrateLegacyMasterDownloadStatus,
  readMasterDownloadStatus,
  saveMasterDownloadStatus,
} from "@/offline/downloads/masterDownloadStatus.service";

export type VoucherSeriesMasterDownloadMetadata = {
  companyId: string;
  saleCount: number;
  saleOrderCount: number;
  completedAt: string;
};

function isValidMetadata(value: unknown, companyId: string): value is VoucherSeriesMasterDownloadMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as VoucherSeriesMasterDownloadMetadata;
  return (
    metadata.companyId === companyId &&
    Number.isInteger(metadata.saleCount) && metadata.saleCount >= 0 &&
    Number.isInteger(metadata.saleOrderCount) && metadata.saleOrderCount >= 0 &&
    typeof metadata.completedAt === "string" &&
    !Number.isNaN(Date.parse(metadata.completedAt))
  );
}

export async function readVoucherSeriesMasterDownloadMetadata(
  userId: string,
  companyId: string,
): Promise<VoucherSeriesMasterDownloadMetadata | null> {
  const saved = await readMasterDownloadStatus(userId, companyId, "voucherSeries");
  if (saved !== null) return isValidMetadata(saved, companyId) ? saved : null;

  const legacyKey = `offlineVoucherSeriesMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy) return null;
  try {
    const metadata = JSON.parse(legacy) as unknown;
    if (!isValidMetadata(metadata, companyId)) return null;
    const migrated = await migrateLegacyMasterDownloadStatus(
      userId,
      companyId,
      "voucherSeries",
      metadata,
      [metadata.saleCount, metadata.saleOrderCount],
    );
    if (migrated) return metadata;
    const current = await readMasterDownloadStatus(userId, companyId, "voucherSeries");
    return isValidMetadata(current, companyId) ? current : null;
  } catch {
    return null;
  }
}

export function saveVoucherSeriesMasterDownloadMetadata(
  database: SQLiteDatabase,
  metadata: VoucherSeriesMasterDownloadMetadata,
): Promise<void> {
  return saveMasterDownloadStatus(database, metadata.companyId, "voucherSeries", metadata);
}
