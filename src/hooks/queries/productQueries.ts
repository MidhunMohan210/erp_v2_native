import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { productService } from "@/services/product.service";

const PRODUCTS_STALE_TIME = 5 * 60_000;

type UseInfiniteProductListQueryParams = {
  cmp_id: string;
  limit?: number;
  search?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  enabled?: boolean;
};

export const productQueryKeys = {
  detail: (productId: string) => [
    ...QUERY_KEYS.products,
    "detail",
    productId,
  ],
  priceLevels: (cmp_id: string) => ["price-levels", cmp_id],
  brands: (cmp_id: string) => [...QUERY_KEYS.products, "brands", cmp_id],
  categories: (cmp_id: string) => [...QUERY_KEYS.products, "categories", cmp_id],
  subcategories: (cmp_id: string) => [
    ...QUERY_KEYS.products,
    "subcategories",
    cmp_id,
  ],
  infiniteList: (
    cmp_id: string,
    limit = 20,
    search = "",
    brand = "",
    category = "",
    subcategory = "",
  ) => [
    ...QUERY_KEYS.products,
    "infinite-list",
    { cmp_id, limit, search, brand, category, subcategory },
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
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(cmp_id) && enabled,
    staleTime: PRODUCTS_STALE_TIME,
  });
}
