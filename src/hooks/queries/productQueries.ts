import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { productService } from "@/services/product.service";
import type { CreateProductPayload } from "@/types/product";

const PRODUCTS_STALE_TIME = 5 * 60_000;

type UseInfiniteProductListQueryParams = {
  cmp_id: string;
  limit?: number;
  search?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  forSale?: boolean;
  enabled?: boolean;
};

export const productQueryKeys = {
  detail: (productId: string, cmp_id = "") => [
    ...QUERY_KEYS.products,
    "detail",
    productId,
    cmp_id,
  ],
  priceLevels: (cmp_id: string) => ["price-levels", cmp_id],
  brands: (cmp_id: string) => [...QUERY_KEYS.products, "brands", cmp_id],
  categories: (cmp_id: string) => [...QUERY_KEYS.products, "categories", cmp_id],
  subcategories: (cmp_id: string) => [
    ...QUERY_KEYS.products,
    "subcategories",
    cmp_id,
  ],
  godowns: (cmp_id: string) => [...QUERY_KEYS.products, "godowns", cmp_id],
  infiniteList: (
    cmp_id: string,
    limit = 20,
    search = "",
    brand = "",
    category = "",
    subcategory = "",
    forSale = false,
  ) => [
    ...QUERY_KEYS.products,
    "infinite-list",
    { cmp_id, limit, search, brand, category, subcategory, forSale },
  ],
};

export function useBrandListQuery(cmp_id: string, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.brands(cmp_id),
    queryFn: () => productService.getBrands(cmp_id),
    enabled: Boolean(cmp_id) && enabled,
    staleTime: PRODUCTS_STALE_TIME,
  });
}

export function useGodownListQuery(cmp_id: string, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.godowns(cmp_id),
    queryFn: () => productService.getGodowns(cmp_id),
    enabled: Boolean(cmp_id) && enabled,
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cmp_id, payload }: { cmp_id: string; payload: CreateProductPayload }) =>
      productService.createProduct(cmp_id, payload),
    onSuccess: async (_product, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      await queryClient.invalidateQueries({ queryKey: productQueryKeys.infiniteList(variables.cmp_id) });
    },
  });
}

export function useCategoryListQuery(cmp_id: string, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.categories(cmp_id),
    queryFn: () => productService.getCategories(cmp_id),
    enabled: Boolean(cmp_id) && enabled,
    staleTime: PRODUCTS_STALE_TIME,
  });
}

export function useSubcategoryListQuery(cmp_id: string, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.subcategories(cmp_id),
    queryFn: () => productService.getSubcategories(cmp_id),
    enabled: Boolean(cmp_id) && enabled,
    staleTime: PRODUCTS_STALE_TIME,
  });
}

export function usePriceLevelListQuery(cmp_id: string, enabled = true) {
  return useQuery({
    queryKey: productQueryKeys.priceLevels(cmp_id),
    queryFn: () => productService.getPriceLevels(cmp_id),
    enabled: Boolean(cmp_id) && enabled,
    staleTime: PRODUCTS_STALE_TIME,
  });
}

export function useInfiniteProductListQuery({
  cmp_id,
  limit = 20,
  search = "",
  brand = "",
  category = "",
  subcategory = "",
  forSale = false,
  enabled = true,
}: UseInfiniteProductListQueryParams) {
  return useInfiniteQuery({
    queryKey: productQueryKeys.infiniteList(
      cmp_id,
      limit,
      search,
      brand,
      category,
      subcategory,
      forSale,
    ),
    queryFn: ({ pageParam = 1, signal }) =>
      productService.getProducts({
        page: pageParam,
        limit,
        cmp_id,
        search,
        brand,
        category,
        subcategory,
        forSale,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(cmp_id) && enabled,
    staleTime: PRODUCTS_STALE_TIME,
  });
}
