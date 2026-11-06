import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPartyMasterDownloadStatus } from "@/offline/party/partyMasterImport.service";
import { getProductMasterDownloadStatus } from "@/offline/product/productMasterImport.service";
import { getPriceLevelMasterDownloadStatus } from "@/offline/priceLevel/priceLevelMasterImport.service";
import { getVoucherSeriesMasterDownloadStatus } from "@/offline/voucherSeries/voucherSeriesMasterImport.service";
import { getAdditionalChargeMasterDownloadStatus } from "@/offline/additionalCharge/additionalChargeMasterImport.service";
import { getProductFilterMasterStatus } from "@/offline/productFilter/productFilterMasterImport.service";

export type AppMode = "online" | "offline";

// The key includes both identities so one company cannot inherit another's mode.
export function getAppModeStorageKey(userId: string, companyId: string): string {
  return `appMode.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
}

// A missing value is a new context, so it starts in Online mode.
export async function readAppMode(userId: string, companyId: string): Promise<AppMode> {
  const saved = await AsyncStorage.getItem(getAppModeStorageKey(userId, companyId));
  return saved === "offline" ? "offline" : "online";
}

// Save only a confirmed mode choice. No transaction or master data lives here.
export async function saveAppMode(userId: string, companyId: string, mode: AppMode): Promise<void> {
  await AsyncStorage.setItem(getAppModeStorageKey(userId, companyId), mode);
}

// Each status checks a completion receipt against this company's SQLite rows.
// Empty non-voucher masters are valid when their receipt confirms the download.
export async function hasCompleteOfflineMasterData(userId: string, companyId: string): Promise<boolean> {
  if (typeof userId !== "string" || !userId.trim() || typeof companyId !== "string" || !companyId.trim()) {
    return false;
  }

  try {
    const [party, product, priceLevel, voucherSeries, additionalCharge, productFilter] = await Promise.all([
      getPartyMasterDownloadStatus(userId, companyId),
      getProductMasterDownloadStatus(userId, companyId),
      getPriceLevelMasterDownloadStatus(userId, companyId),
      getVoucherSeriesMasterDownloadStatus(userId, companyId),
      getAdditionalChargeMasterDownloadStatus(userId, companyId),
      getProductFilterMasterStatus(userId, companyId),
    ]);

    return (
      party.isComplete &&
      product.isComplete &&
      priceLevel.isComplete &&
      voucherSeries.isComplete &&
      additionalCharge.isComplete &&
      productFilter.isComplete &&
      // A completed empty series download cannot support these voucher flows.
      voucherSeries.saleStoredCount > 0 &&
      voucherSeries.saleOrderStoredCount > 0 &&
      voucherSeries.receiptStoredCount > 0
    );
  } catch {
    // An unavailable or unreadable encrypted database is never ready.
    return false;
  }
}
