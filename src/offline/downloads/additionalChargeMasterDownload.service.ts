import api from "@/services/api";
import type { OfflineAdditionalCharge } from "@/offline/additionalCharge/additionalChargeMasterRepository";

/** Existing master endpoint returns the complete company list without pagination. */
export async function downloadAdditionalChargeMaster(companyId: string): Promise<OfflineAdditionalCharge[]> {
  const response = await api.get<unknown>("/api/additional-charges", { params: { cmp_id: companyId } });
  if (!Array.isArray(response.data)) throw new Error("The Additional Charge download returned an invalid response.");
  return response.data as OfflineAdditionalCharge[];
}
