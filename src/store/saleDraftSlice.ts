import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { Party } from "@/types/party";
import type { PriceLevel } from "@/types/product";
import type { SaleDraft, SaleItem } from "@/types/sale";
import type { SaleTaxType, VoucherSeriesItem } from "@/types/voucher";
import { calculateSaleItems } from "@/utils/sale";

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
  selectedPriceLevel: null,
  items: [],
  itemTotals: {
    subTotal: 0,
    totalDiscount: 0,
    taxableAmount: 0,
    totalIgstAmount: 0,
    totalCgstAmount: 0,
    totalSgstAmount: 0,
    totalCessAmount: 0,
    totalAddlCessAmount: 0,
    totalTaxAmount: 0,
    itemTotal: 0,
  },
};

function setCalculatedItems(state: SaleDraft, items: SaleItem[]) {
  const result = calculateSaleItems(items, state.taxType);
  state.items = result.items;
  state.itemTotals = result.totals;
}

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
      state.selectedPriceLevel = null;
      state.items = [];
      state.itemTotals = { ...initialState.itemTotals };
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
    setSalePriceLevel: (state, action: PayloadAction<PriceLevel | null>) => {
      state.selectedPriceLevel = action.payload;
    },
    setSaleItems: (state, action: PayloadAction<SaleItem[]>) => {
      setCalculatedItems(state, action.payload);
    },
    updateSaleItem: (state, action: PayloadAction<SaleItem>) => {
      setCalculatedItems(
        state,
        state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        ),
      );
    },
    removeSaleItem: (state, action: PayloadAction<string>) => {
      setCalculatedItems(
        state,
        state.items.filter((item) => item.id !== action.payload),
      );
    },
    resetSaleDraft: () => initialState,
  },
});

export const {
  resetSaleDraft,
  setSaleDate,
  setSaleParty,
  setSalePriceLevel,
  setSaleItems,
  updateSaleItem,
  removeSaleItem,
  setSaleSeries,
  startSaleDraft,
} = saleDraftSlice.actions;

export default saleDraftSlice.reducer;
