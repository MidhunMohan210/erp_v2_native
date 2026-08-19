import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { Party } from "@/types/party";
import type { PriceLevel } from "@/types/product";
import type {
  SaleOrderDespatchDetails,
  SaleOrderAdditionalCharge,
  SaleOrderAdditionalChargeTotals,
  SaleOrderItem,
  SaleOrderItemTotals,
  SaleOrderDetail,
  SaleOrderPriceSource,
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
  editingVoucherId: string | null;
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

type LoadSaleOrderForEditPayload = {
  companyId: string;
  saleOrder: SaleOrderDetail;
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

function getEditTransactionDate(value: string): string {
  // The API may return a full ISO timestamp, while the date picker uses YYYY-MM-DD.
  return value.includes("T") ? value.slice(0, 10) : value;
}

function getSavedInitialPriceSource(
  value: string | null | undefined,
): SaleOrderPriceSource {
  if (
    value === "priceLevel" ||
    value === "lsp" ||
    value === "gsp" ||
    value === "manual" ||
    value === "saved"
  ) {
    return value;
  }

  return "saved";
}

const initialState: VoucherDraftState = {
  voucherType: null,
  companyId: "",
  editingVoucherId: null,
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
        state.voucherType === action.payload.voucherType &&
        state.editingVoucherId === null;

      // Reopening the same draft keeps its values. Changing company or voucher
      // type starts a clean draft so incompatible data cannot be reused.
      if (sameDraftContext) return;

      state.voucherType = action.payload.voucherType;
      state.companyId = action.payload.companyId;
      state.editingVoucherId = null;
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
    loadSaleOrderForEdit: (
      state,
      action: PayloadAction<LoadSaleOrderForEditPayload>,
    ) => {
      const { companyId, saleOrder } = action.payload;
      const taxType = saleOrder.tax_type || "igst";
      const alreadyEditingThisOrder =
        state.companyId === companyId &&
        state.voucherType === "saleOrder" &&
        state.editingVoucherId === saleOrder._id;

      // A background detail refetch must not overwrite unsaved mobile edits.
      if (alreadyEditingThisOrder) return;

      state.voucherType = "saleOrder";
      state.companyId = companyId;
      state.editingVoucherId = saleOrder._id;
      state.transactionDate = getEditTransactionDate(saleOrder.date);
      state.selectedSeries = {
        _id: saleOrder.series_id || "",
        seriesName: saleOrder.series_name || "",
      };
      state.selectedParty = {
        _id: saleOrder.party_id || "",
        partyName: saleOrder.party_snapshot.name,
        gstNo: saleOrder.party_snapshot.gst_no || "",
        billingAddress: saleOrder.party_snapshot.billing_address || "",
        shippingAddress: saleOrder.party_snapshot.shipping_address || "",
        mobileNumber: saleOrder.party_snapshot.mobile || "",
        state: saleOrder.party_snapshot.state || "",
      };
      state.taxType = taxType;
      state.despatchDetails = {
        challanNo: saleOrder.despatch_details.challan_no || "",
        containerNo: saleOrder.despatch_details.container_no || "",
        despatchThrough:
          saleOrder.despatch_details.despatch_through || "",
        destination: saleOrder.despatch_details.destination || "",
        vehicleNo: saleOrder.despatch_details.vehicle_no || "",
        orderNo: saleOrder.despatch_details.order_no || "",
        termsOfPay: saleOrder.despatch_details.terms_of_pay || "",
        termsOfDelivery:
          saleOrder.despatch_details.terms_of_delivery || "",
      };
      state.selectedPriceLevel = saleOrder.price_level_id
        ? {
            _id: saleOrder.price_level_id,
            name: saleOrder.price_level_name || "",
          }
        : null;

      // Saved snake-case document rows are converted back to the simple UI shape.
      state.items = saleOrder.items.map((item) => ({
        _id: item._id,
        id: item.item_id,
        name: item.item_name,
        hsn: item.hsn || "",
        unit: item.base_unit || item.unit || "",
        baseUnit: item.base_unit || item.unit || "",
        selectedUnit: item.selected_unit || item.base_unit || item.unit || "",
        alternateUnit: item.alternate_unit ?? null,
        baseDenominator: item.base_denominator ?? null,
        altConversion: item.alt_conversion ?? null,
        priceLevels: [],
        priceLevelId: item.price_level_id || null,
        rate: Number(item.rate) || 0,
        taxRate: Number(item.tax_rate) || 0,
        cgst: taxType === "cgst_sgst" ? Number(item.tax_rate) / 2 : 0,
        sgst: taxType === "cgst_sgst" ? Number(item.tax_rate) / 2 : 0,
        igst: taxType === "igst" ? Number(item.tax_rate) : 0,
        cess: Number(item.cess_rate) || 0,
        addlCess: Number(item.addl_cess_rate) || 0,
        taxType,
        initialPriceSource: getSavedInitialPriceSource(
          item.initial_price_source,
        ),
        actualQty: Number(item.actual_qty) || 0,
        billedQty: Number(item.billed_qty) || 0,
        alternateActualQty: item.alternate_actual_qty ?? null,
        alternateBilledQty: item.alternate_billed_qty ?? null,
        taxInclusive: Boolean(item.tax_inclusive),
        discountType: item.discount_type || "amount",
        discountPercentage: Number(item.discount_percentage) || 0,
        discountAmount: Number(item.discount_amount) || 0,
        description: item.description || "",
        basePrice: Number(item.base_price) || 0,
        taxableAmount: Number(item.taxable_amount) || 0,
        igstAmount: Number(item.igst_amount) || 0,
        cgstAmount: Number(item.cgst_amount) || 0,
        sgstAmount: Number(item.sgst_amount) || 0,
        taxAmount: Number(item.tax_amount) || 0,
        cessAmount: Number(item.cess_amount) || 0,
        addlCessAmount: Number(item.addl_cess_amount) || 0,
        totalAmount: Number(item.total_amount) || 0,
      }));
      state.additionalCharges = saleOrder.additional_charges.map(
        (charge) => ({
          _id: charge._id,
          option: charge.option,
          value: String(charge.value ?? ""),
          action:
            charge.action === "subtract" ? "subtract" : "add",
          hsn: charge.hsn || "",
          igst: Number(charge.igst) || 0,
          cgst: Number(charge.cgst) || 0,
          sgst: Number(charge.sgst) || 0,
          cess: Number(charge.cess) || 0,
          addlCess: Number(charge.addl_cess) || 0,
          stateCess: Number(charge.state_cess) || 0,
          igstAmount: Number(charge.igst_amount) || 0,
          cgstAmount: Number(charge.cgst_amount) || 0,
          sgstAmount: Number(charge.sgst_amount) || 0,
          taxAmount: Number(charge.tax_amount) || 0,
          cessAmount: Number(charge.cess_amount) || 0,
          addlCessAmount: Number(charge.addl_cess_amount) || 0,
          stateCessAmount: Number(charge.state_cess_amount) || 0,
          finalValue: Number(charge.final_value) || 0,
        }),
      );
      recalculateDraftItems(state);
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
  loadSaleOrderForEdit,
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
