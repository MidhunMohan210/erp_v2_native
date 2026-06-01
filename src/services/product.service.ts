import api from "@/services/api";
import type { ProductListResponse } from "@/types/product";

type GetProductsParams = {
  page: number;
  limit?: number;
  cmp_id: string;
  search?: string;
  signal?: AbortSignal;
};

export const productService = {
  getProducts: async ({
    page,
    limit = 20,
    cmp_id,
    search = "",
    signal,
  }: GetProductsParams): Promise<ProductListResponse> => {
    const response = await api.get<ProductListResponse>("/api/product", {
      params: {
        page,
        limit,
        cmp_id,
        search,
      },
      signal,
    });

    return {
      items: response.data?.items ?? [],
      page: response.data?.page ?? page,
      hasMore: Boolean(response.data?.hasMore),
      total: response.data?.total,
      limit: response.data?.limit ?? limit,
    };
  },
};
