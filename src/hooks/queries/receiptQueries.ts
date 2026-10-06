import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { cashTransactionService } from "@/services/cashTransaction.service";
import type {
  CancelReceiptRequest,
  CreateReceiptRequest,
} from "@/types/receipt";

type CancelReceiptMutationInput = {
  receiptId: string;
  payload: CancelReceiptRequest;
};

export const receiptQueryKeys = {
  all: QUERY_KEYS.receipts,
  details: (companyId: string) => [
    ...QUERY_KEYS.receipts,
    "detail",
    companyId,
  ] as const,
  detail: (receiptId: string, companyId: string) => [
    ...QUERY_KEYS.receipts,
    "detail",
    companyId,
    receiptId,
  ] as const,
};

export const receiptAuditQueryKeys = {
  detail: (companyId: string, receiptId: string) => ["receipt-audit", companyId, receiptId] as const,
  list: (companyId: string) => ["receipts-for-audit", companyId] as const,
};

/** Development-only diagnostic data. It never performs a write. */
export function useReceiptAuditQuery(companyId: string, receiptId: string, enabled: boolean) {
  return useQuery({
    queryKey: receiptAuditQueryKeys.detail(companyId, receiptId),
    queryFn: () => cashTransactionService.getReceiptAudit(receiptId, companyId),
    enabled: Boolean(companyId) && Boolean(receiptId) && enabled,
  });
}

export function useReceiptsForAuditQuery(companyId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: receiptAuditQueryKeys.list(companyId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => cashTransactionService.getReceiptsForAudit(companyId, pageParam),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(companyId) && enabled,
  });
}

export function useResetAllTransactionsMutation() {
  return useMutation({ mutationFn: (companyId: string) => cashTransactionService.resetAllTransactions(companyId) });
}

export function useReceiptDetailQuery(
  receiptId: string,
  companyId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: receiptQueryKeys.detail(receiptId, companyId),
    queryFn: () =>
      cashTransactionService.getReceiptDetail(receiptId, companyId),
    enabled: Boolean(receiptId) && Boolean(companyId) && enabled,
  });
}

export function useCreateReceiptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReceiptRequest) =>
      cashTransactionService.createReceipt(payload),
    onSuccess: (response, payload) => {
      const receipt = response.data.cashTransaction;

      queryClient.setQueryData(
        receiptQueryKeys.detail(receipt._id, payload.cmp_id),
        receipt,
      );
    },
  });
}

export function useCancelReceiptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiptId, payload }: CancelReceiptMutationInput) =>
      cashTransactionService.cancelReceipt(receiptId, payload),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(
        receiptQueryKeys.detail(
          variables.receiptId,
          variables.payload.cmp_id,
        ),
        response.data.cashTransaction,
      );
    },
  });
}
