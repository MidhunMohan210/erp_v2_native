import api from "@/services/api";
import type { OfflinePriceLevel } from "@/offline/priceLevel/priceLevelMasterRepository";

/** The existing endpoint returns the complete, small Price Level master. */
export async function downloadPriceLevelMaster(
  companyId: string,
): Promise<OfflinePriceLevel[]> {
  const response = await api.get<unknown>("/api/price-levels", {
    params: { cmp_id: companyId },
  });
  if (!Array.isArray(response.data)) {
    throw new Error("The Price Level master download returned an invalid response.");
  }
  return response.data as OfflinePriceLevel[];
}
