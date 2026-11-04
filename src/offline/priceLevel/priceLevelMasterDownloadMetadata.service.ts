import AsyncStorage from "@react-native-async-storage/async-storage";

export type PriceLevelMasterDownloadMetadata = {
  companyId: string;
  priceLevelCount: number;
  completedAt: string;
};

function getStorageKey(userId: string, companyId: string): string {
  return `offlinePriceLevelMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
}

function isValidMetadata(value: unknown, companyId: string): value is PriceLevelMasterDownloadMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as PriceLevelMasterDownloadMetadata;
  return (
    metadata.companyId === companyId &&
    Number.isInteger(metadata.priceLevelCount) &&
    metadata.priceLevelCount >= 0 &&
    typeof metadata.completedAt === "string" &&
    !Number.isNaN(Date.parse(metadata.completedAt))
  );
}

export async function readPriceLevelMasterDownloadMetadata(
  userId: string,
  companyId: string,
): Promise<PriceLevelMasterDownloadMetadata | null> {
  const saved = await AsyncStorage.getItem(getStorageKey(userId, companyId));
  if (!saved) return null;

  try {
    const metadata = JSON.parse(saved) as unknown;
    return isValidMetadata(metadata, companyId) ? metadata : null;
  } catch {
    return null;
  }
}

/** Saves the completion receipt only after SQLite accepts the full response. */
export function savePriceLevelMasterDownloadMetadata(
  userId: string,
  metadata: PriceLevelMasterDownloadMetadata,
): Promise<void> {
  return AsyncStorage.setItem(
    getStorageKey(userId, metadata.companyId),
    JSON.stringify(metadata),
  );
}
