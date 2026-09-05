import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { Party } from "@/types/party";
import type { PriceLevel } from "@/types/product";
import type { SaleDraft, SaleItem } from "@/types/sale";
import type {
  SaleOrderAdditionalCharge,
  SaleOrderDespatchDetails,
} from "@/types/saleOrder";
import type { SaleTaxType, VoucherSeriesItem } from "@/types/voucher";
import { calculateAdditionalChargeTotals } from "@/utils/additionalCharge";
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
  despatchDetails: {
    challanNo: "",
    containerNo: "",
    despatchThrough: "",
    destination: "",
    vehicleNo: "",
    orderNo: "",
    termsOfPay: "",
    termsOfDelivery: "",
  },
  additionalCharges: [],
  additionalChargeTotals: {
    totalAdditionalCharge: 0,
    totalAdditionalChargeTaxAmount: 0,
    totalAdditionalChargeIgstAmount: 0,
    totalAdditionalChargeCgstAmount: 0,
    totalAdditionalChargeSgstAmount: 0,
    totalAdditionalChargeCessAmount: 0,
    totalAdditionalChargeAddlCessAmount: 0,
    totalAdditionalChargeStateCessAmount: 0,
    amountWithAdditionalCharge: 0,
    finalAmount: 0,
  },
  narration: "",
};

function recalculateSaleDraft(state: SaleDraft, items = state.items) {
  const itemCalculation = calculateSaleItems(items, state.taxType);
  state.items = itemCalculation.items;
  state.itemTotals = itemCalculation.totals;

  const chargeCalculation = calculateAdditionalChargeTotals(
    state.additionalCharges,
    state.taxType,
    itemCalculation.totals.itemTotal,
  );
  state.additionalCharges = chargeCalculation.charges;
  state.additionalChargeTotals = chargeCalculation.totals;
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
      state.despatchDetails = { ...initialState.despatchDetails };
      state.additionalCharges = [];
      state.additionalChargeTotals = {
        ...initialState.additionalChargeTotals,
      };
      state.narration = "";
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
      // Party state can switch GST mode, so recalculate both item and charge tax.
      recalculateSaleDraft(state);
    },
    setSalePriceLevel: (state, action: PayloadAction<PriceLevel | null>) => {
      state.selectedPriceLevel = action.payload;
    },
    setSaleItems: (state, action: PayloadAction<SaleItem[]>) => {
      recalculateSaleDraft(state, action.payload);
    },
    updateSaleItem: (state, action: PayloadAction<SaleItem>) => {
      recalculateSaleDraft(
        state,
        state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        ),
      );
    },
    removeSaleItem: (state, action: PayloadAction<string>) => {
      recalculateSaleDraft(
        state,
        state.items.filter((item) => item.id !== action.payload),
      );
    },
    setSaleDespatchDetails: (
      state,
      action: PayloadAction<SaleOrderDespatchDetails>,
    ) => {
      state.despatchDetails = action.payload;
    },
    setSaleAdditionalCharges: (
      state,
      action: PayloadAction<SaleOrderAdditionalCharge[]>,
    ) => {
      state.additionalCharges = action.payload;
      recalculateSaleDraft(state);
    },
    setSaleNarration: (state, action: PayloadAction<string>) => {
      state.narration = action.payload;
    },
    resetSaleDraft: () => initialState,
  },
});

export const {
  resetSaleDraft,
  setSaleDate,
  setSaleParty,
  setSalePriceLevel,
  setSaleDespatchDetails,
  setSaleAdditionalCharges,
  setSaleNarration,
  setSaleItems,
  updateSaleItem,
  removeSaleItem,
  setSaleSeries,
  startSaleDraft,
} = saleDraftSlice.actions;

export default saleDraftSlice.reducer;
