import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Party } from "../types/party";
import type {
  ReceiptAllocation,
  ReceiptCashBankType,
  ReceiptDetail,
  ReceiptEditAllocationMode,
  ReceiptEditAvailability,
  ReceiptEditAvailabilityItem,
  ReceiptInstrumentType,
  ReceiptSettlementDetail,
} from "../types/receipt";
import { getRequiredReceiptAccountType } from "../utils/receipt";

export type ReceiptEditAllocationStatus = "in_progress" | "confirmed";

export type ReceiptEditState = {
  companyId: string;
  receiptId: string | null;
  mode: ReceiptEditAllocationMode;
  expectedUpdatedAt: string | null;
  seriesId: string;
  seriesName: string;
  voucherNumber: string;
  originalAmount: number;
  amount: string;
  transactionDate: string;
  partyId: string;
  partyName: string;
  cashBankId: string | null;
  cashBankName: string | null;
  cashBankType: ReceiptCashBankType | null;
  instrumentType: ReceiptInstrumentType;
  chequeNumber: string;
  chequeDate: string | null;
  narration: string;
  historicalSettlements: ReceiptSettlementDetail[];
  originalAllocations: ReceiptAllocation[];
  allocations: ReceiptAllocation[];
  availabilityItems: ReceiptEditAvailabilityItem[];
  allocationStatus: ReceiptEditAllocationStatus;
  pendingAmountChange: number | null;
};

type InitializeReceiptEditPayload = {
  companyId: string;
  receipt: ReceiptDetail;
};

type ReceiptEditChequeDetails = {
  chequeNumber: string;
  chequeDate: string | null;
};

export const initialReceiptEditState: ReceiptEditState = {
  companyId: "",
  receiptId: null,
  mode: "snapshot",
  expectedUpdatedAt: null,
  seriesId: "",
  seriesName: "",
  voucherNumber: "",
  originalAmount: 0,
  amount: "",
  transactionDate: "",
  partyId: "",
  partyName: "",
  cashBankId: null,
  cashBankName: null,
  cashBankType: null,
  instrumentType: "cash",
  chequeNumber: "",
  chequeDate: null,
  narration: "",
  historicalSettlements: [],
  originalAllocations: [],
  allocations: [],
  availabilityItems: [],
  allocationStatus: "in_progress",
  pendingAmountChange: null,
};

function getDateOnly(value: string | null): string | null {
  if (!value) return null;
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
}

function getLocalTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildAllocationsFromAvailability(
  availability: ReceiptEditAvailability,
): ReceiptAllocation[] {
  const itemById = new Map(
    availability.items.map((item) => [item._id, item]),
  );

  return availability.original_allocations
    .filter((allocation) => {
      const item = itemById.get(allocation.outstanding);
      return Boolean(item) && allocation.settled_amount > 0;
    })
    .map((allocation) => {
      const item = itemById.get(allocation.outstanding);
      return {
        outstandingId: allocation.outstanding,
        settledAmount: allocation.settled_amount,
        confirmedPendingAmount: item?.editable_available,
        billNumber: item?.bill_no,
        billDate: item?.bill_date,
      };
    });
}

const receiptEditSlice = createSlice({
  name: "receiptEdit",
  initialState: initialReceiptEditState,
  reducers: {
    initializeReceiptEdit: (
      _state,
      action: PayloadAction<InitializeReceiptEditPayload>,
    ) => {
      const { companyId, receipt } = action.payload;
      const historicalSettlements = receipt.settlement_details ?? [];

      return {
        ...initialReceiptEditState,
        companyId,
        receiptId: receipt._id,
        expectedUpdatedAt: receipt.updated_at,
        seriesId: receipt.series_id,
        seriesName: receipt.series_name,
        voucherNumber: receipt.voucher_number,
        originalAmount: receipt.amount,
        amount: String(receipt.amount),
        transactionDate: getDateOnly(receipt.date) ?? "",
        partyId: receipt.party_id,
        partyName: receipt.party_name,
        cashBankId: receipt.cash_bank_id,
        cashBankName: receipt.cash_bank_name,
        cashBankType: receipt.cash_bank_type,
        instrumentType: receipt.instrument_type,
        chequeNumber: receipt.cheque_number ?? "",
        chequeDate:
          receipt.instrument_type === "cheque"
            ? getDateOnly(receipt.cheque_date) ?? getLocalTodayDate()
            : null,
        narration: receipt.narration ?? "",
        historicalSettlements,
        originalAllocations: historicalSettlements.map((item) => ({
          outstandingId: item.outstanding,
          settledAmount: item.settled_amount,
          billNumber: item.outstanding_number,
          billDate: item.outstanding_date,
        })),
      };
    },
    setReceiptEditDate: (state, action: PayloadAction<string>) => {
      state.transactionDate = action.payload;
    },
    setReceiptEditAmount: (state, action: PayloadAction<string>) => {
      if (state.mode !== "reallocation") return;
      state.amount = action.payload;
      state.allocationStatus = "in_progress";
    },
    setReceiptEditPendingAmount: (
      state,
      action: PayloadAction<number | null>,
    ) => {
      state.pendingAmountChange = action.payload;
    },
    setReceiptEditInstrument: (
      state,
      action: PayloadAction<ReceiptInstrumentType>,
    ) => {
      const previousInstrument = state.instrumentType;
      const nextInstrument = action.payload;
      const requiredAccountType = getRequiredReceiptAccountType(nextInstrument);
      state.instrumentType = nextInstrument;

      if (state.cashBankType !== requiredAccountType) {
        state.cashBankId = null;
        state.cashBankName = null;
        state.cashBankType = null;
      }
      if (previousInstrument === "cheque" && nextInstrument !== "cheque") {
        state.chequeNumber = "";
        state.chequeDate = null;
      }
      if (previousInstrument !== "cheque" && nextInstrument === "cheque") {
        state.chequeDate = getLocalTodayDate();
      }
    },
    setReceiptEditCashBank: (state, action: PayloadAction<Party | null>) => {
      const account = action.payload;
      const requiredAccountType = getRequiredReceiptAccountType(
        state.instrumentType,
      );

      if (!account || account.partyType !== requiredAccountType) {
        state.cashBankId = null;
        state.cashBankName = null;
        state.cashBankType = null;
        return;
      }

      state.cashBankId = account._id;
      state.cashBankName = account.partyName ?? "";
      state.cashBankType = requiredAccountType;
    },
    setReceiptEditChequeDetails: (
      state,
      action: PayloadAction<ReceiptEditChequeDetails>,
    ) => {
      if (state.instrumentType !== "cheque") return;
      state.chequeNumber = action.payload.chequeNumber;
      state.chequeDate = action.payload.chequeDate;
    },
    setReceiptEditNarration: (state, action: PayloadAction<string>) => {
      state.narration = action.payload;
    },
    enterReceiptReallocationMode: (
      state,
      action: PayloadAction<ReceiptEditAvailability>,
    ) => {
      const availability = action.payload;
      state.mode = "reallocation";
      state.expectedUpdatedAt = availability.expected_updated_at;
      state.originalAllocations = buildAllocationsFromAvailability(availability);
      state.allocations = buildAllocationsFromAvailability(availability);
      state.availabilityItems = availability.items;
      state.allocationStatus = "in_progress";
      if (state.pendingAmountChange !== null) {
        state.amount = String(state.pendingAmountChange);
      }
      state.pendingAmountChange = null;
    },
    setReceiptEditAllocationProgress: (
      state,
      action: PayloadAction<ReceiptAllocation[]>,
    ) => {
      if (state.mode !== "reallocation") return;
      state.allocations = action.payload;
      state.allocationStatus = "in_progress";
    },
    setReceiptEditAllocations: (
      state,
      action: PayloadAction<ReceiptAllocation[]>,
    ) => {
      if (state.mode !== "reallocation") return;
      state.allocations = action.payload;
      state.allocationStatus = "confirmed";
    },
    clearReceiptEdit: () => initialReceiptEditState,
  },
});

export const {
  clearReceiptEdit,
  enterReceiptReallocationMode,
  initializeReceiptEdit,
  setReceiptEditAllocationProgress,
  setReceiptEditAllocations,
  setReceiptEditAmount,
  setReceiptEditCashBank,
  setReceiptEditChequeDetails,
  setReceiptEditDate,
  setReceiptEditInstrument,
  setReceiptEditNarration,
  setReceiptEditPendingAmount,
} = receiptEditSlice.actions;

export default receiptEditSlice.reducer;
