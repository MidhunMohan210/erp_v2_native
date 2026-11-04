import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProductFilterMetadata = {
  companyId: string;
  brandCount: number;
  categoryCount: number;
  subcategoryCount: number;
  completedAt: string;
};

function metadataKey(userId: string, companyId: string): string {
  return `offlineProductFilterMaster.v1.${encodeURIComponent(
    JSON.stringify([userId, companyId]),
  )}`;
}

function isValidMetadata(
  value: unknown,
  companyId: string,
): value is ProductFilterMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as ProductFilterMetadata;
  const counts = [
    metadata.brandCount,
    metadata.categoryCount,
    metadata.subcategoryCount,
  ];
  return (
    metadata.companyId === companyId &&
    counts.every((count) => Number.isInteger(count) && count >= 0) &&
    typeof metadata.completedAt === "string" &&
    !Number.isNaN(Date.parse(metadata.completedAt))
  );
}

export async function readProductFilterMetadata(
  userId: string,
  companyId: string,
): Promise<ProductFilterMetadata | null> {
  const saved = await AsyncStorage.getItem(metadataKey(userId, companyId));
  if (!saved) return null;

  try {
    const metadata = JSON.parse(saved) as unknown;
    return isValidMetadata(metadata, companyId) ? metadata : null;
  } catch {
    return null;
  }
}

export function saveProductFilterMetadata(
  userId: string,
  metadata: ProductFilterMetadata,
): Promise<void> {
  return AsyncStorage.setItem(
    metadataKey(userId, metadata.companyId),
    JSON.stringify(metadata),
  );
}
