import { useQuery } from "@tanstack/react-query";

import { cashTransactionService } from "@/services/cashTransaction.service";

export const receiptQueryKeys = {
  detail: (receiptId: string, companyId: string) => [
    "receipt",
    receiptId,
    companyId,
  ],
};

export function useReceiptDetailQuery(
  receiptId: string,
  companyId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: receiptQueryKeys.detail(receiptId, companyId),
    queryFn: () => cashTransactionService.getReceipt(receiptId, companyId),
    enabled: Boolean(receiptId) && Boolean(companyId) && enabled,
  });
}
