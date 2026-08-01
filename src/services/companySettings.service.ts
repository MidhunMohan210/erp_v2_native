import api from "@/services/api";
import type { CompanySettings } from "@/types/companySettings";

export const companySettingsService = {
  async getCompanySettings(companyId: string): Promise<CompanySettings> {
    const response = await api.get<CompanySettings>("/api/company-settings", {
      params: { cmp_id: companyId },
    });

    return response.data;
  },
};
