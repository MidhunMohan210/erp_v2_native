import api from "@/services/api";
import type {
  PrintConfigurationResponse,
  PrintConfigPatch,
  PrintVoucherType,
} from "@/types/printConfiguration";

export const printConfigurationService = {
  async getPrintConfiguration(
    companyId: string,
    voucherType: PrintVoucherType,
  ): Promise<PrintConfigurationResponse> {
    const response = await api.get<PrintConfigurationResponse>(
      `/api/print-config/${companyId}/${voucherType}`,
    );

    return response.data;
  },

  async updatePrintConfiguration(
    companyId: string,
    voucherType: PrintVoucherType,
    changes: PrintConfigPatch,
  ): Promise<PrintConfigurationResponse> {
    const response = await api.patch<PrintConfigurationResponse>(
      `/api/print-config/${companyId}/${voucherType}`,
      changes,
    );

    return response.data;
  },
};
