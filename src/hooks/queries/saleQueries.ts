import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";

import {
  saleService,
  type CreateSalePayload,
} from "@/services/sale.service";

export const saleAuditQueryKeys = {
  detail: (companyId: string, saleId: string) =>
    ["sale-audit", companyId, saleId] as const,
};

// A GET Sale-detail endpoint does not exist yet. The create response is cached
// under this key so the new voucher can be shown immediately after saving.
export const saleDetailQueryKeys = {
  detail: (companyId: string, saleId: string) =>
    ["sales", "detail", companyId, saleId] as const,
};

export const salesForAuditQueryKeys = {
  list: (companyId: string) => ["sales-for-audit", companyId] as const,
};

type CreateSaleMutationInput = {
  companyId: string;
  payload: CreateSalePayload;
};

type ResetSaleTestDataMutationInput = {
  companyId: string;
};

/** Mutation state stays in React Query so the Redux draft remains retryable. */
export function useCreateSaleMutation() {
  return useMutation({
    mutationFn: ({ companyId, payload }: CreateSaleMutationInput) =>
      saleService.createSale(payload, companyId),
  });
}

/** The destructive development reset remains separate from normal Sale mutations. */
export function useResetSaleTestDataMutation() {
  return useMutation({
    mutationFn: ({ companyId }: ResetSaleTestDataMutationInput) =>
      saleService.resetSaleTestData({ cmpId: companyId }),
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
