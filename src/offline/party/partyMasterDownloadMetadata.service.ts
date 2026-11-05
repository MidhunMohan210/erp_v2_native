import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";

import {
  migrateLegacyMasterDownloadStatus,
  readMasterDownloadStatus,
  saveMasterDownloadStatus,
} from "@/offline/downloads/masterDownloadStatus.service";

export type PartyMasterDownloadMetadata = {
  companyId: string;
  partyCount: number;
  completedAt: string;
};

function isValidMetadata(value: unknown, companyId: string): value is PartyMasterDownloadMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as PartyMasterDownloadMetadata;
  return (
    metadata.companyId === companyId &&
    Number.isInteger(metadata.partyCount) && metadata.partyCount >= 0 &&
    typeof metadata.completedAt === "string" &&
    !Number.isNaN(Date.parse(metadata.completedAt))
  );
}

export async function readPartyMasterDownloadMetadata(
  userId: string,
  companyId: string,
): Promise<PartyMasterDownloadMetadata | null> {
  const saved = await readMasterDownloadStatus(userId, companyId, "party");
  if (saved !== null) return isValidMetadata(saved, companyId) ? saved : null;

  const legacyKey = `offlinePartyMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy) return null;
  try {
    const metadata = JSON.parse(legacy) as unknown;
    if (!isValidMetadata(metadata, companyId)) return null;
    const migrated = await migrateLegacyMasterDownloadStatus(
      userId,
      companyId,
      "party",
      metadata,
      [metadata.partyCount],
    );
    if (migrated) return metadata;
    const current = await readMasterDownloadStatus(userId, companyId, "party");
    return isValidMetadata(current, companyId) ? current : null;
  } catch {
    return null;
  }
}

export function savePartyMasterDownloadMetadata(
  database: SQLiteDatabase,
  metadata: PartyMasterDownloadMetadata,
): Promise<void> {
  return saveMasterDownloadStatus(database, metadata.companyId, "party", metadata);
}
