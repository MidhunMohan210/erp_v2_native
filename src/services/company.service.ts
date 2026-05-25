import api from "@/services/api";
import type { Company } from "@/types/company";

export const companyService = {
  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get<Company[]>("/api/company");
    return response.data || [];
  },
};
