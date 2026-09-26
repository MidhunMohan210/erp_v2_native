import api from "@/services/api";
import type { Party } from "@/types/party";
import type { VoucherSeriesItem } from "@/types/voucher";

export type CreateReceiptPayload = {
  cmp_id: string;
  date: string;
  party: Party;
  cashBank: Party;
  selectedSeries: VoucherSeriesItem;
  amount: number;
  narration: string;
};

export type ReceiptSettlementDetail = {
  _id: string;
  outstanding_number: string;
  settled_amount: number;
};

// This is the receipt shape returned by GET /cash-transactions/:id.
export type ReceiptDetail = {
  _id: string;
  voucher_number: string;
  date: string;
  party_name: string;
  cash_bank_name: string;
  cash_bank_type: "cash" | "bank";
  instrument_type: "cash" | "cheque" | "neft" | "rtgs" | "upi";
  amount: number;
  advance_amount?: number;
  narration?: string | null;
  status: "active" | "cancelled";
  settlement_details?: ReceiptSettlementDetail[];
};

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

export const cashTransactionService = {
  async createReceipt(payload: CreateReceiptPayload): Promise<unknown> {
    const requestPayload = {
      cmp_id: payload.cmp_id,
      cmpId: payload.cmp_id,
      voucher_type: "receipt",
      selectedSeries: {
        _id: payload.selectedSeries._id,
        seriesName: payload.selectedSeries.seriesName,
      },
      series_id: payload.selectedSeries._id,
      date: payload.date,
      party_id: payload.party._id,
      party_name: payload.party.partyName || "",
      cash_bank_id: payload.cashBank._id,
      cash_bank_name: payload.cashBank.partyName || "",
      cash_bank_type: payload.cashBank.partyType || "",
      instrument_type: "cash",
      amount: Number(payload.amount) || 0,
      narration: payload.narration.trim() || null,
      settlement_details: [],
    };

    const response = await api.post("/cash-transactions", requestPayload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  async getReceipt(id: string, cmp_id: string): Promise<ReceiptDetail> {
    const response = await api.get<{
      data?: { cashTransaction?: ReceiptDetail };
    }>(`/cash-transactions/${id}`, {
      params: { cmp_id },
    });

    const receipt = response.data?.data?.cashTransaction;
    if (!receipt) {
      throw new Error("Receipt was not found");
    }

    return receipt;
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
