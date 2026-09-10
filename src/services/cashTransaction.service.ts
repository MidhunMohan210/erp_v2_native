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
};
