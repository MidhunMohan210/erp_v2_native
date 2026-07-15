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
};
