import AsyncStorage from "@react-native-async-storage/async-storage";

export type PartyMasterDownloadMetadata = {
  companyId: string;
  partyCount: number;
  completedAt: string;
};

function getStorageKey(userId: string, companyId: string): string {
  return `offlinePartyMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
}

function isValidMetadata(value: unknown, companyId: string): value is PartyMasterDownloadMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as PartyMasterDownloadMetadata;
  return (
    metadata.companyId === companyId &&
    Number.isInteger(metadata.partyCount) &&
    metadata.partyCount >= 0 &&
    typeof metadata.completedAt === "string" &&
    !Number.isNaN(Date.parse(metadata.completedAt))
  );
}

export async function readPartyMasterDownloadMetadata(
  userId: string,
  companyId: string,
): Promise<PartyMasterDownloadMetadata | null> {
  const saved = await AsyncStorage.getItem(getStorageKey(userId, companyId));
  if (!saved) return null;

  try {
    const metadata = JSON.parse(saved) as unknown;
    return isValidMetadata(metadata, companyId) ? metadata : null;
  } catch {
    return null;
  }
}

/** Stores the receipt only after SQLite accepts the complete Party snapshot. */
export function savePartyMasterDownloadMetadata(
  userId: string,
  metadata: PartyMasterDownloadMetadata,
): Promise<void> {
  return AsyncStorage.setItem(
    getStorageKey(userId, metadata.companyId),
    JSON.stringify(metadata),
  );
}
