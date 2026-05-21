import api from "@/services/api";
import type { CompanySummary } from "@/store/companySlice";

export const companyService = {
  getCompanies: async (): Promise<CompanySummary[]> => {
    const response = await api.get<CompanySummary[]>("/api/company");
    return response.data || [];
  },
};
