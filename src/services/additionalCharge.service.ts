import api from "@/services/api";
import type { AdditionalChargeMaster } from "@/types/saleOrder";

export const additionalChargeService = {
  async getAdditionalCharges(
    companyId: string,
    signal?: AbortSignal,
  ): Promise<AdditionalChargeMaster[]> {
    const response = await api.get<AdditionalChargeMaster[]>(
      "/api/additional-charges",
      {
        params: { cmp_id: companyId },
        signal,
      },
    );

    return Array.isArray(response.data) ? response.data : [];
  },
};
