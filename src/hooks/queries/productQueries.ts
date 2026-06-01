import { useInfiniteQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { productService } from "@/services/product.service";

const PRODUCTS_STALE_TIME = 5 * 60_000;

type UseInfiniteProductListQueryParams = {
  cmp_id: string;
  limit?: number;
  search?: string;
  enabled?: boolean;
};

export const productQueryKeys = {
  infiniteList: (cmp_id: string, limit = 20, search = "") => [
    ...QUERY_KEYS.products,
    "infinite-list",
    { cmp_id, limit, search },
  ],
};

export function useInfiniteProductListQuery({
  cmp_id,
  limit = 20,
  search = "",
  enabled = true,
}: UseInfiniteProductListQueryParams) {
  return useInfiniteQuery({
    queryKey: productQueryKeys.infiniteList(cmp_id, limit, search),
    queryFn: ({ pageParam = 1, signal }) =>
      productService.getProducts({
        page: pageParam,
        limit,
        cmp_id,
        search,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(cmp_id) && enabled,
    staleTime: PRODUCTS_STALE_TIME,
  });
}
