import api from "@/services/api";
import type {
  TaxClassification,
  TaxClassificationPayload,
} from "@/types/taxClassification";

type TaxClassificationResponse = {
  data: TaxClassification;
};

type TaxClassificationListResponse = {
  data: TaxClassification[];
};

export const taxClassificationService = {
  getTaxClassifications: async (
    cmp_id: string,
    signal?: AbortSignal,
  ): Promise<TaxClassification[]> => {
    const response = await api.get<TaxClassificationListResponse>(
      "/api/tax-classifications",
      { params: { cmp_id }, signal },
    );
    return response.data.data ?? [];
  },

  getTaxClassificationById: async (
    cmp_id: string,
    classificationId: string,
    signal?: AbortSignal,
  ): Promise<TaxClassification> => {
    const response = await api.get<TaxClassificationResponse>(
      `/api/tax-classifications/${classificationId}`,
      { params: { cmp_id }, signal },
    );
    return response.data.data;
  },

  createTaxClassification: async (
    cmp_id: string,
    payload: TaxClassificationPayload,
  ): Promise<TaxClassification> => {
    const response = await api.post<TaxClassificationResponse>(
      "/api/tax-classifications",
      payload,
      { params: { cmp_id } },
    );
    return response.data.data;
  },

  updateTaxClassification: async (
    cmp_id: string,
    classificationId: string,
    payload: TaxClassificationPayload,
  ): Promise<TaxClassification> => {
    const response = await api.put<TaxClassificationResponse>(
      `/api/tax-classifications/${classificationId}`,
      payload,
      { params: { cmp_id } },
    );
    return response.data.data;
  },

  deleteTaxClassification: async (
    cmp_id: string,
    classificationId: string,
  ): Promise<void> => {
    await api.delete(`/api/tax-classifications/${classificationId}`, {
      params: { cmp_id },
    });
  },
};
