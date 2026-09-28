import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
