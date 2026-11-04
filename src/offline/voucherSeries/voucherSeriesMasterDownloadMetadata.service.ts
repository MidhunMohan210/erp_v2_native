import AsyncStorage from "@react-native-async-storage/async-storage";

export type VoucherSeriesMasterDownloadMetadata = {
  companyId: string;
  saleCount: number;
  saleOrderCount: number;
  completedAt: string;
};

function getStorageKey(userId: string, companyId: string): string {
  return `offlineVoucherSeriesMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
}

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
  const saved = await AsyncStorage.getItem(getStorageKey(userId, companyId));
  if (!saved) return null;

  try {
    const metadata = JSON.parse(saved) as unknown;
    return isValidMetadata(metadata, companyId) ? metadata : null;
  } catch {
    return null;
  }
}

/** Saves completion only after both voucher-type snapshots are committed. */
export function saveVoucherSeriesMasterDownloadMetadata(
  userId: string,
  metadata: VoucherSeriesMasterDownloadMetadata,
): Promise<void> {
  return AsyncStorage.setItem(
    getStorageKey(userId, metadata.companyId),
    JSON.stringify(metadata),
  );
}
