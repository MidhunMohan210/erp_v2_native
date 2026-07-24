import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { Party } from "@/types/party";
import type { PriceLevel } from "@/types/product";
import type {
  SaleOrderDespatchDetails,
  SaleOrderAdditionalCharge,
  SaleOrderAdditionalChargeTotals,
  SaleOrderItem,
  SaleOrderItemTotals,
} from "@/types/saleOrder";
import type {
  SaleTaxType,
  VoucherSeriesItem,
  VoucherType,
} from "@/types/voucher";
import {
  calculateSaleOrderItems,
  getProductPriceLevelRate,
} from "@/utils/saleOrder";
import { calculateAdditionalChargeTotals } from "@/utils/additionalCharge";

export type VoucherDraftState = {
  voucherType: VoucherType | null;
  companyId: string;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem | null;
  selectedParty: Party | null;
  taxType: SaleTaxType;
  despatchDetails: SaleOrderDespatchDetails;
  selectedPriceLevel: PriceLevel | null;
  items: SaleOrderItem[];
  itemTotals: SaleOrderItemTotals;
  additionalCharges: SaleOrderAdditionalCharge[];
  additionalChargeTotals: SaleOrderAdditionalChargeTotals;
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

const emptyDespatchDetails: SaleOrderDespatchDetails = {
  challanNo: "",
  containerNo: "",
  despatchThrough: "",
  destination: "",
  vehicleNo: "",
  orderNo: "",
  termsOfPay: "",
  termsOfDelivery: "",
};

const emptyItemTotals: SaleOrderItemTotals = {
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
};

const emptyAdditionalChargeTotals: SaleOrderAdditionalChargeTotals = {
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
};

function recalculateDraftItems(state: VoucherDraftState) {
  const calculation = calculateSaleOrderItems(state.items, state.taxType);
  state.items = calculation.items;
  state.itemTotals = calculation.totals;

  const chargeCalculation = calculateAdditionalChargeTotals(
    state.additionalCharges,
    state.taxType,
    calculation.totals.itemTotal,
  );
  state.additionalCharges = chargeCalculation.charges;
  state.additionalChargeTotals = chargeCalculation.totals;
}

const initialState: VoucherDraftState = {
  voucherType: null,
  companyId: "",
  transactionDate: "",
  selectedSeries: null,
  selectedParty: null,
  taxType: "igst",
  despatchDetails: emptyDespatchDetails,
  selectedPriceLevel: null,
  items: [],
  itemTotals: emptyItemTotals,
  additionalCharges: [],
  additionalChargeTotals: emptyAdditionalChargeTotals,
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
      state.despatchDetails = { ...emptyDespatchDetails };
      state.selectedPriceLevel = null;
      state.items = [];
      state.itemTotals = { ...emptyItemTotals };
      state.additionalCharges = [];
      state.additionalChargeTotals = { ...emptyAdditionalChargeTotals };
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
      recalculateDraftItems(state);
    },
    setVoucherDespatchDetails: (
      state,
      action: PayloadAction<SaleOrderDespatchDetails>,
    ) => {
      state.despatchDetails = action.payload;
    },
    setVoucherPriceLevel: (
      state,
      action: PayloadAction<PriceLevel | null>,
    ) => {
      state.selectedPriceLevel = action.payload;
      const priceLevelId = action.payload?._id ?? "";

      // Changing a price level must re-price every existing line together.
      state.items = state.items.map((item) => {
        if (priceLevelId) {
          return {
            ...item,
            priceLevelId,
            rate: getProductPriceLevelRate(item, priceLevelId) ?? 0,
            initialPriceSource: "priceLevel",
          };
        }

        return {
          ...item,
          priceLevelId: null,
          rate: item.initialPriceSource === "priceLevel" ? 0 : item.rate,
        };
      });
      recalculateDraftItems(state);
    },
    addVoucherItem: (state, action: PayloadAction<SaleOrderItem>) => {
      const incomingItem = action.payload;
      const existingItem = state.items.find(
        (item) => item.id === incomingItem.id,
      );

      if (existingItem) {
        existingItem.actualQty += incomingItem.actualQty;
        existingItem.billedQty += incomingItem.billedQty;
      } else {
        state.items.push(incomingItem);
      }
      recalculateDraftItems(state);
    },
    updateVoucherItem: (state, action: PayloadAction<SaleOrderItem>) => {
      const index = state.items.findIndex(
        (item) => item.id === action.payload.id,
      );
      if (index === -1) return;

      if (
        action.payload.actualQty <= 0 &&
        action.payload.billedQty <= 0
      ) {
        state.items.splice(index, 1);
      } else {
        state.items[index] = action.payload;
      }
      recalculateDraftItems(state);
    },
    setVoucherItems: (state, action: PayloadAction<SaleOrderItem[]>) => {
      // The product selector commits its complete staged basket only on Continue.
      state.items = action.payload;
      recalculateDraftItems(state);
    },
    setVoucherAdditionalCharges: (
      state,
      action: PayloadAction<SaleOrderAdditionalCharge[]>,
    ) => {
      state.additionalCharges = action.payload;
      recalculateDraftItems(state);
    },
    removeVoucherItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      recalculateDraftItems(state);
    },
    resetVoucherDraft: () => initialState,
  },
});

export const {
  addVoucherItem,
  removeVoucherItem,
  resetVoucherDraft,
  setVoucherDate,
  setVoucherAdditionalCharges,
  setVoucherDespatchDetails,
  setVoucherItems,
  setVoucherParty,
  setVoucherPriceLevel,
  setVoucherSeries,
  startVoucherDraft,
  updateVoucherItem,
} = voucherDraftSlice.actions;

export default voucherDraftSlice.reducer;
