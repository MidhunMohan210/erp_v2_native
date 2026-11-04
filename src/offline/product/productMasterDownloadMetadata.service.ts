import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProductMasterDownloadMetadata = {
  companyId: string;
  productCount: number;
  completedAt: string;
};

function getStorageKey(userId: string, companyId: string): string {
  return `offlineProductMaster.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
}

function isValidMetadata(value: unknown, companyId: string): value is ProductMasterDownloadMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as ProductMasterDownloadMetadata;
  return (
    metadata.companyId === companyId &&
    Number.isInteger(metadata.productCount) &&
    metadata.productCount >= 0 &&
    typeof metadata.completedAt === "string" &&
    !Number.isNaN(Date.parse(metadata.completedAt))
  );
}

export async function readProductMasterDownloadMetadata(
  userId: string,
  companyId: string,
): Promise<ProductMasterDownloadMetadata | null> {
  const saved = await AsyncStorage.getItem(getStorageKey(userId, companyId));
  if (!saved) return null;

  try {
    const metadata = JSON.parse(saved) as unknown;
    return isValidMetadata(metadata, companyId) ? metadata : null;
  } catch {
    return null;
  }
}

/** Stores completion only after SQLite has atomically accepted every Product. */
export function saveProductMasterDownloadMetadata(
  userId: string,
  metadata: ProductMasterDownloadMetadata,
): Promise<void> {
  return AsyncStorage.setItem(
    getStorageKey(userId, metadata.companyId),
    JSON.stringify(metadata),
  );
}
