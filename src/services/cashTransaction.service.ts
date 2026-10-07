import api from "@/services/api";
import type {
  CancelReceiptRequest,
  CancelReceiptResponse,
  CreateReceiptRequest,
  CreateReceiptResponse,
  ReceiptDetail,
  ReceiptEditAvailability,
  UpdateReceiptRequest,
  UpdateReceiptResponse,
} from "@/types/receipt";
import type { ReceiptAuditListResponse, ReceiptAuditResponse } from "@/types/receiptAudit";

// The backend calculates this from active CashBankLedger entries.
export type CashBankBalance = {
  _id: string | null;
  cash_bank_name: string;
  cash_bank_type: "cash" | "bank" | null;
  current_balance: number;
};

export type CashBankTransaction = {
  _id: string;
  cash_bank_id: string;
  date: string;
  voucher_type: "sale" | "receipt" | "payment";
  voucher_id: string;
  voucher_number: string;
  party_name?: string;
  narration?: string | null;
  amount: number;
  direction: "in" | "out";
  running_balance: number;
  tally_status?: "pending" | "accepted";
};

export type CashBankTransactionHistory = {
  account: { id: string; name: string; type: "cash" | "bank" };
  summary: { balance: number; totalIn: number; totalOut: number };
  items: CashBankTransaction[];
  total: number;
  page: number;
  hasMore: boolean;
};

export type CashBankTransactionFilters = {
  from?: string;
  to?: string;
  voucherType?: "sale" | "receipt" | "payment";
  direction?: "in" | "out";
};

export type TransactionResetResponse = {
  success: true;
  deleted: Record<string, number>;
  stockReset: { productsAffected: number; stockRowsAffected: number; stockValueSetTo: number };
};

export const cashTransactionService = {
  async createReceipt(
    payload: CreateReceiptRequest,
  ): Promise<CreateReceiptResponse> {
    // Axios treats both the new-create 201 and idempotent-replay 200 as success.
    const response = await api.post<CreateReceiptResponse>(
      "/api/cash-transactions",
      payload,
    );

    return response.data;
  },

  async getReceiptDetail(id: string, cmp_id: string): Promise<ReceiptDetail> {
    const response = await api.get<{
      success: true;
      data: { cashTransaction: ReceiptDetail };
    }>(`/api/cash-transactions/${id}`, {
      params: { cmp_id },
    });

    const receipt = response.data.data?.cashTransaction;
    if (!receipt) {
      throw new Error("Receipt was not found");
    }

    return receipt;
  },

  async getReceiptEditAvailability(
    id: string,
    companyId: string,
  ): Promise<ReceiptEditAvailability> {
    const response = await api.get<{
      success: true;
      data: ReceiptEditAvailability;
    }>(`/api/cash-transactions/${id}/edit-allocation-availability`, {
      headers: { "X-Company-Id": companyId },
    });

    return response.data.data;
  },

  async updateReceipt(
    id: string,
    companyId: string,
    payload: UpdateReceiptRequest,
  ): Promise<UpdateReceiptResponse> {
    const response = await api.put<UpdateReceiptResponse>(
      `/api/cash-transactions/${id}`,
      payload,
      { headers: { "X-Company-Id": companyId } },
    );

    return response.data;
  },

  async getReceiptAudit(receiptId: string, companyId: string): Promise<ReceiptAuditResponse> {
    const response = await api.get<ReceiptAuditResponse>(`/api/cash-transactions/${receiptId}/audit`, {
      headers: { "X-Company-Id": companyId },
    });
    return response.data;
  },

  async getReceiptsForAudit(companyId: string, page: number): Promise<ReceiptAuditListResponse> {
    const response = await api.get<{ data?: ReceiptAuditListResponse }>("/api/vouchers", {
      params: { cmpId: companyId, voucherType: "receipt", page, limit: 30 },
    });
    return response.data.data ?? { page, hasMore: false, vouchers: [] };
  },

  async resetAllTransactions(companyId: string): Promise<TransactionResetResponse> {
    const response = await api.post<TransactionResetResponse>("/api/dev/reset-all-transactions", {
      cmp_id: companyId,
      confirm: "RESET_ALL_TRANSACTIONS",
    });
    return response.data;
  },

  async cancelReceipt(
    id: string,
    payload: CancelReceiptRequest,
  ): Promise<CancelReceiptResponse> {
    const response = await api.put<CancelReceiptResponse>(
      `/api/cash-transactions/${id}/cancel`,
      payload,
    );

    return response.data;
  },

  async getCashBankLedgerBalances(
    cmp_id: string,
    cashBankType?: "cash" | "bank",
  ): Promise<CashBankBalance[]> {
    const response = await api.get<{ data?: { balances?: CashBankBalance[] } }>(
      "/api/cash-transactions/cash-bank-balances",
      {
        params: {
          cmp_id,
          ...(cashBankType ? { cash_bank_type: cashBankType } : {}),
        },
      },
    );

    return response.data?.data?.balances ?? [];
  },

  async getCashBankTransactions(
    cmp_id: string,
    cashBankId: string,
    page: number,
    filters: CashBankTransactionFilters,
    signal?: AbortSignal,
  ): Promise<CashBankTransactionHistory> {
    const response = await api.get<{ data?: CashBankTransactionHistory }>(
      `/api/cash-transactions/cash-bank/${cashBankId}/transactions`,
      {
        params: {
          cmp_id,
          page,
          limit: 20,
          from: filters.from,
          to: filters.to,
          voucher_type: filters.voucherType,
          direction: filters.direction,
        },
        signal,
      },
    );
    if (!response.data?.data) throw new Error("Cash/bank transactions were not found");
    return response.data.data;
  },
};
