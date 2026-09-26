import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  cashTransactionService,
  type CashBankTransactionFilters,
} from "@/services/cashTransaction.service";

export const cashBankQueryKeys = {
  all: ["cash-bank"] as const,
  balances: (companyId: string, accountType: "cash" | "bank") =>
    ["cash-bank", "balances", companyId, accountType] as const,
  transactions: (
    companyId: string,
    accountId: string,
    filters: CashBankTransactionFilters,
  ) => ["cash-bank", "transactions", companyId, accountId, filters] as const,
};

export function useCashBankLedgerBalancesQuery(
  companyId: string,
  accountType: "cash" | "bank",
  enabled = true,
) {
  return useQuery({
    queryKey: cashBankQueryKeys.balances(companyId, accountType),
    queryFn: () =>
      cashTransactionService.getCashBankLedgerBalances(companyId, accountType),
    enabled: Boolean(companyId) && enabled,
    staleTime: 30_000,
  });
}

export function useInfiniteCashBankTransactionsQuery(
  companyId: string,
  accountId: string,
  filters: CashBankTransactionFilters,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: cashBankQueryKeys.transactions(companyId, accountId, filters),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      cashTransactionService.getCashBankTransactions(
        companyId,
        accountId,
        pageParam,
        filters,
        signal,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(companyId) && Boolean(accountId) && enabled,
  });
}
