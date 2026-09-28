import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Party } from "../types/party";
import type {
  CreateReceiptRequest,
  ReceiptAllocation,
  ReceiptInstrumentType,
  ReceiptSubmissionRecovery,
  ReceiptSubmissionRecoveryState,
} from "../types/receipt";
import type { VoucherSeriesItem } from "../types/voucher";
import { getRequiredReceiptAccountType } from "../utils/receipt";

export type ReceiptDraftState = {
  companyId: string;
  requestId: string;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem | null;
  selectedParty: Party | null;
  receiptAmount: string;
  selectedCashBank: Party | null;
  instrumentType: ReceiptInstrumentType;
  allocations: ReceiptAllocation[];
  allocationStatus: "not_started" | "in_progress" | "confirmed";
  narration: string;
  chequeNumber: string;
  chequeDate: string | null;
  submittedPayload: CreateReceiptRequest | null;
  submissionRecoveryState: ReceiptSubmissionRecoveryState | null;
};

type InitializeReceiptDraftPayload = {
  companyId: string;
  requestId: string;
  transactionDate: string;
};

type ReceiptChequeDetails = {
  chequeNumber: string;
  chequeDate: string | null;
};

export const initialReceiptDraftState: ReceiptDraftState = {
  companyId: "",
  requestId: "",
  transactionDate: "",
  selectedSeries: null,
  selectedParty: null,
  receiptAmount: "",
  selectedCashBank: null,
  instrumentType: "cash",
  allocations: [],
  allocationStatus: "not_started",
  narration: "",
  chequeNumber: "",
  chequeDate: null,
  submittedPayload: null,
  submissionRecoveryState: null,
};

function draftCanBeEdited(state: ReceiptDraftState): boolean {
  // An uncertain submission must be retried with its exact saved payload.
  return state.submittedPayload === null;
}

const receiptDraftSlice = createSlice({
  name: "receiptDraft",
  initialState: initialReceiptDraftState,
  reducers: {
    initializeReceiptDraft: (
      state,
      action: PayloadAction<InitializeReceiptDraftPayload>,
    ) => {
      const isSameLogicalDraft =
        state.companyId === action.payload.companyId &&
        Boolean(state.requestId);

      if (isSameLogicalDraft) return;

      return {
        ...initialReceiptDraftState,
        companyId: action.payload.companyId,
        requestId: action.payload.requestId,
        transactionDate: action.payload.transactionDate,
      };
    },
    setReceiptDate: (state, action: PayloadAction<string>) => {
      if (!draftCanBeEdited(state)) return;
      state.transactionDate = action.payload;
    },
    setReceiptSeries: (
      state,
      action: PayloadAction<VoucherSeriesItem | null>,
    ) => {
      if (!draftCanBeEdited(state)) return;
      state.selectedSeries = action.payload;
    },
    setReceiptParty: (state, action: PayloadAction<Party | null>) => {
      if (!draftCanBeEdited(state)) return;

      const partyChanged = state.selectedParty?._id !== action.payload?._id;
      state.selectedParty = action.payload;

      if (partyChanged) {
        state.allocations = [];
        state.allocationStatus = "not_started";
      }
    },
    setReceiptAmount: (state, action: PayloadAction<string>) => {
      if (!draftCanBeEdited(state)) return;
      state.receiptAmount = action.payload;
      // The allocation screen recalculates from fresh, oldest-first rows.
      state.allocations = [];
      state.allocationStatus = "not_started";
    },
    setReceiptInstrument: (
      state,
      action: PayloadAction<ReceiptInstrumentType>,
    ) => {
      if (!draftCanBeEdited(state)) return;

      const previousInstrument = state.instrumentType;
      const nextInstrument = action.payload;
      const requiredAccountType = getRequiredReceiptAccountType(nextInstrument);

      state.instrumentType = nextInstrument;

      if (state.selectedCashBank?.partyType !== requiredAccountType) {
        state.selectedCashBank = null;
      }

      if (previousInstrument === "cheque" && nextInstrument !== "cheque") {
        state.chequeNumber = "";
        state.chequeDate = null;
      }
    },
    setReceiptCashBank: (state, action: PayloadAction<Party | null>) => {
      if (!draftCanBeEdited(state)) return;

      const requiredAccountType = getRequiredReceiptAccountType(
        state.instrumentType,
      );
      const nextAccount = action.payload;

      state.selectedCashBank =
        nextAccount && nextAccount.partyType === requiredAccountType
          ? nextAccount
          : null;
    },
    setReceiptAllocations: (
      state,
      action: PayloadAction<ReceiptAllocation[]>,
    ) => {
      if (!draftCanBeEdited(state)) return;
      state.allocations = action.payload;
      state.allocationStatus = "confirmed";
    },
    setReceiptAllocationProgress: (
      state,
      action: PayloadAction<ReceiptAllocation[]>,
    ) => {
      if (!draftCanBeEdited(state)) return;
      state.allocations = action.payload;
      state.allocationStatus = "in_progress";
    },
    setReceiptNarration: (state, action: PayloadAction<string>) => {
      if (!draftCanBeEdited(state)) return;
      state.narration = action.payload;
    },
    setReceiptChequeDetails: (
      state,
      action: PayloadAction<ReceiptChequeDetails>,
    ) => {
      if (!draftCanBeEdited(state) || state.instrumentType !== "cheque") {
        return;
      }

      state.chequeNumber = action.payload.chequeNumber;
      state.chequeDate = action.payload.chequeDate;
    },
    setReceiptSubmittedPayload: (
      state,
      action: PayloadAction<CreateReceiptRequest | null>,
    ) => {
      state.submittedPayload = action.payload;
      state.submissionRecoveryState = action.payload ? "submitting" : null;
    },
    setReceiptSubmissionRecoveryState: (
      state,
      action: PayloadAction<ReceiptSubmissionRecoveryState>,
    ) => {
      if (!state.submittedPayload) return;
      state.submissionRecoveryState = action.payload;
    },
    restoreReceiptSubmission: (
      _state,
      action: PayloadAction<ReceiptSubmissionRecovery>,
    ) => {
      const { companyId, payload, seriesName, state } = action.payload;

      // A restored draft is intentionally reconstructed from the immutable
      // API body. It stays locked and can only be retried or completed.
      return {
        companyId,
        requestId: payload.request_id,
        transactionDate: payload.date,
        selectedSeries: {
          _id: payload.series_id,
          seriesName: seriesName || "Receipt series",
        },
        selectedParty: {
          _id: payload.party_id,
          partyName: payload.party_name,
          partyType: "party",
        },
        receiptAmount: String(payload.amount),
        selectedCashBank: {
          _id: payload.cash_bank_id,
          partyName: payload.cash_bank_name,
          partyType: payload.cash_bank_type,
        },
        instrumentType: payload.instrument_type,
        allocations: payload.settlement_details.map((row) => ({
          outstandingId: row.outstanding,
          settledAmount: row.settled_amount,
        })),
        allocationStatus: "confirmed" as const,
        narration: payload.narration ?? "",
        chequeNumber: payload.cheque_number ?? "",
        chequeDate: payload.cheque_date,
        submittedPayload: payload,
        // A process restart makes an in-flight request uncertain even if the
        // last durable write happened immediately before POST.
        submissionRecoveryState:
          state === "submitting" ? "uncertain" : state,
      };
    },
    clearReceiptDraft: () => initialReceiptDraftState,
  },
});

export const {
  clearReceiptDraft,
  initializeReceiptDraft,
  setReceiptAllocations,
  setReceiptAllocationProgress,
  setReceiptAmount,
  setReceiptCashBank,
  setReceiptChequeDetails,
  setReceiptDate,
  setReceiptInstrument,
  setReceiptNarration,
  setReceiptParty,
  setReceiptSeries,
  setReceiptSubmissionRecoveryState,
  setReceiptSubmittedPayload,
  restoreReceiptSubmission,
} = receiptDraftSlice.actions;

export default receiptDraftSlice.reducer;
