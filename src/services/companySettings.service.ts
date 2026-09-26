import api from "@/services/api";
import type {
  CompanySettings,
  UpdateCompanySettingsPayload,
} from "@/types/companySettings";

export const companySettingsService = {
  async getCompanySettings(companyId: string): Promise<CompanySettings> {
    const response = await api.get<CompanySettings>("/api/company-settings", {
      params: { cmp_id: companyId },
    });

    return response.data;
  },

  async updateCompanySettings(
    companyId: string,
    payload: UpdateCompanySettingsPayload,
  ): Promise<CompanySettings> {
    const response = await api.put<CompanySettings>(
      "/api/company-settings",
      payload,
      { params: { cmp_id: companyId } },
    );

    return response.data;
  },
};
