import AsyncStorage from "@react-native-async-storage/async-storage";

export type AdditionalChargeMasterDownloadMetadata = { companyId: string; chargeCount: number; completedAt: string };
function key(userId: string, companyId: string) { return `offlineAdditionalChargeMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`; }
function valid(value: unknown, companyId: string): value is AdditionalChargeMasterDownloadMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as AdditionalChargeMasterDownloadMetadata;
  return metadata.companyId === companyId && Number.isInteger(metadata.chargeCount) && metadata.chargeCount >= 0 && typeof metadata.completedAt === "string" && !Number.isNaN(Date.parse(metadata.completedAt));
}
export async function readAdditionalChargeMasterDownloadMetadata(userId: string, companyId: string): Promise<AdditionalChargeMasterDownloadMetadata | null> {
  const saved = await AsyncStorage.getItem(key(userId, companyId));
  if (!saved) return null;
  try { const metadata = JSON.parse(saved) as unknown; return valid(metadata, companyId) ? metadata : null; } catch { return null; }
}
/** Stores the receipt only after the atomic SQLite replacement succeeds. */
export function saveAdditionalChargeMasterDownloadMetadata(userId: string, metadata: AdditionalChargeMasterDownloadMetadata): Promise<void> {
  return AsyncStorage.setItem(key(userId, metadata.companyId), JSON.stringify(metadata));
}
