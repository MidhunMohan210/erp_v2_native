import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { Party } from "@/types/party";
import type {
  SaleTaxType,
  VoucherSeriesItem,
  VoucherType,
} from "@/types/voucher";

export type VoucherDraftState = {
  voucherType: VoucherType | null;
  companyId: string;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem | null;
  selectedParty: Party | null;
  taxType: SaleTaxType;
};

// This describes the information required to start a voucher draft.
type StartVoucherDraftPayload = {
  voucherType: VoucherType;
  companyId: string;
  transactionDate: string;
};

type SetVoucherPartyPayload = {
  party: Party;
  taxType: SaleTaxType;
};

const initialState: VoucherDraftState = {
  voucherType: null,
  companyId: "",
  transactionDate: "",
  selectedSeries: null,
  selectedParty: null,
  taxType: "igst",
};

const voucherDraftSlice = createSlice({
  name: "voucherDraft",
  initialState,
  reducers: {
    startVoucherDraft: (
      state,

      //PayloadAction is a type supplied by Redux Toolkit.
      // The value inside angle brackets tells TypeScript what action.payload contains:
      action: PayloadAction<StartVoucherDraftPayload>,
    ) => {
      const sameDraftContext =
        state.companyId === action.payload.companyId &&
        state.voucherType === action.payload.voucherType;

      // Reopening the same draft keeps its values. Changing company or voucher
      // type starts a clean draft so incompatible data cannot be reused.
      if (sameDraftContext) return;

      state.voucherType = action.payload.voucherType;
      state.companyId = action.payload.companyId;
      state.transactionDate = action.payload.transactionDate;
      state.selectedSeries = null;
      state.selectedParty = null;
      state.taxType = "igst";
    },
    setVoucherDate: (state, action: PayloadAction<string>) => {
      state.transactionDate = action.payload;
    },
    setVoucherSeries: (
      state,
      action: PayloadAction<VoucherSeriesItem | null>,
    ) => {
      state.selectedSeries = action.payload;
    },
    setVoucherParty: (
      state,
      action: PayloadAction<SetVoucherPartyPayload>,
    ) => {
      state.selectedParty = action.payload.party;

      // A customer's state decides which GST calculation will apply to later
      // sale-order items, so the two values are confirmed together.
      state.taxType = action.payload.taxType;
    },
    resetVoucherDraft: () => initialState,
  },
});

export const {
  resetVoucherDraft,
  setVoucherDate,
  setVoucherParty,
  setVoucherSeries,
  startVoucherDraft,
} = voucherDraftSlice.actions;

export default voucherDraftSlice.reducer;
