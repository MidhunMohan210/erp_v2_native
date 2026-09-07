import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";

import {
  saleService,
  type CreateSalePayload,
} from "@/services/sale.service";

export const saleAuditQueryKeys = {
  detail: (companyId: string, saleId: string) =>
    ["sale-audit", companyId, saleId] as const,
};

export const salesForAuditQueryKeys = {
  list: (companyId: string) => ["sales-for-audit", companyId] as const,
};

type CreateSaleMutationInput = {
  companyId: string;
  payload: CreateSalePayload;
};

/** Mutation state stays in React Query so the Redux draft remains retryable. */
export function useCreateSaleMutation() {
  return useMutation({
    mutationFn: ({ companyId, payload }: CreateSaleMutationInput) =>
      saleService.createSale(payload, companyId),
  });
}

/** The audit is aggregated by the backend; this query intentionally makes one request. */
export function useSaleAuditQuery(
  companyId: string,
  saleId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: saleAuditQueryKeys.detail(companyId, saleId),
    queryFn: () => saleService.getSaleAudit(saleId, companyId),
    enabled,
  });
}

/** Lists Sale timeline rows so the development audit does not require typing IDs. */
export function useSalesForAuditQuery(companyId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: salesForAuditQueryKeys.list(companyId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => saleService.getSalesForAudit(companyId, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(companyId) && enabled,
  });
}
