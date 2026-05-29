import api from "@/services/api";
import type { Company } from "@/types/company";

export type CreateCompanyPayload = {
  name: string;
  flat?: string;
  road?: string;
  place: string;
  landmark?: string;
  pin: string;
  country: string;
  state: string;
  email: string;
  mobile: string;
  gstNum?: string;
  pan?: string;
  website?: string;
  logo?: string;
  type: "integrated" | "standalone";
  currency: string;
  currencyName: string;
  currencySymbol: string;
  industry: string;
  financialYear: {
    format: string;
    startingYear: number;
    startMonth: number;
    endMonth: number;
  };
};

export const companyService = {
  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get<Company[]>("/api/company");
    return response.data || [];
  },
  createCompany: async (payload: CreateCompanyPayload): Promise<Company> => {
    const response = await api.post<{ message?: string; company: Company }>(
      "/api/company/register",
      payload,
    );
    return response.data.company;
  },
};
