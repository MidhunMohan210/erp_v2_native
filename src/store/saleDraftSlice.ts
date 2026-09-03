import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { Party } from "@/types/party";
import type { SaleDraft } from "@/types/sale";
import type { SaleTaxType, VoucherSeriesItem } from "@/types/voucher";

type StartSaleDraftPayload = {
  companyId: string;
  transactionDate: string;
};

type SetSalePartyPayload = {
  party: Party;
  taxType: SaleTaxType;
};

const initialState: SaleDraft = {
  companyId: "",
  transactionDate: "",
  selectedSeries: null,
  selectedParty: null,
  taxType: "igst",
};

const saleDraftSlice = createSlice({
  name: "saleDraft",
  initialState,
  reducers: {
    startSaleDraft: (
      state,
      action: PayloadAction<StartSaleDraftPayload>,
    ) => {
      const isSameCompany = state.companyId === action.payload.companyId;

      // Returning to this screen keeps the active, unsaved Sale header.
      if (isSameCompany) return;

      state.companyId = action.payload.companyId;
      state.transactionDate = action.payload.transactionDate;
      state.selectedSeries = null;
      state.selectedParty = null;
      state.taxType = "igst";
    },
    setSaleDate: (state, action: PayloadAction<string>) => {
      state.transactionDate = action.payload;
    },
    setSaleSeries: (
      state,
      action: PayloadAction<VoucherSeriesItem | null>,
    ) => {
      state.selectedSeries = action.payload;
    },
    setSaleParty: (
      state,
      action: PayloadAction<SetSalePartyPayload>,
    ) => {
      state.selectedParty = action.payload.party;
      state.taxType = action.payload.taxType;
    },
    resetSaleDraft: () => initialState,
  },
});

export const {
  resetSaleDraft,
  setSaleDate,
  setSaleParty,
  setSaleSeries,
  startSaleDraft,
} = saleDraftSlice.actions;

export default saleDraftSlice.reducer;
