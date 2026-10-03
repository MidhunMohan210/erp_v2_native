import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { Party } from "@/types/party";
import type { PriceLevel } from "@/types/product";
import type { SaleDetail, SaleDraft, SaleItem } from "@/types/sale";
import type { CreateSalePayload } from "@/services/sale.service";
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

type SetSaleSubmissionPayload = {
  request_id: string;
  submittedPayload: CreateSalePayload;
};

type LoadSaleForEditPayload = {
  companyId: string;
  sale: SaleDetail;
};

const initialState: SaleDraft = {
  companyId: "",
  editingSaleId: null,
  request_id: null,
  submittedPayload: null,
  submissionRecoveryState: null,
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

function getEditTransactionDate(value: string): string {
  // The native date picker expects YYYY-MM-DD, while the API can return ISO.
  return value.includes("T") ? value.slice(0, 10) : value;
}

function getSavedInitialPriceSource(
  value: string | null | undefined,
): SaleItem["initialPriceSource"] {
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

function getSavedSaleItemTaxRates(savedTaxRate: number): {
  taxRate: number;
  igst: number;
  cgst: number;
  sgst: number;
} {
  const taxRate = Number(savedTaxRate) || 0;

  // A saved Sale owns its tax rate. Keeping both representations means a Party
  // change can switch GST mode without consulting the current Product master.
  return {
    taxRate,
    igst: taxRate,
    cgst: taxRate / 2,
    sgst: taxRate / 2,
  };
}

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

function draftCanBeEdited(state: SaleDraft): boolean {
  // A pending create must retry the frozen request body, not current form values.
  return state.editingSaleId !== null || state.submittedPayload === null;
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
      state.editingSaleId = null;
      state.request_id = null;
      state.submittedPayload = null;
      state.submissionRecoveryState = null;
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
    loadSaleForEdit: (
      state,
      action: PayloadAction<LoadSaleForEditPayload>,
    ) => {
      const { companyId, sale } = action.payload;
      const taxType = sale.tax_type || "igst";
      const alreadyEditingThisSale =
        state.companyId === companyId && state.editingSaleId === sale._id;

      // A detail-query refetch must never discard edits currently in progress.
      if (alreadyEditingThisSale) return;

      state.companyId = companyId;
      state.editingSaleId = sale._id;
      state.request_id = null;
      state.submittedPayload = null;
      state.submissionRecoveryState = null;
      state.transactionDate = getEditTransactionDate(sale.date);
      state.selectedSeries = {
        _id: sale.series_id || "",
        seriesName: sale.series_name || "",
      };
      state.selectedParty = {
        _id: sale.party_id || "",
        partyName: sale.party_snapshot.name,
        gstNo: sale.party_snapshot.gst_no || "",
        billingAddress: sale.party_snapshot.billing_address || "",
        shippingAddress: sale.party_snapshot.shipping_address || "",
        mobileNumber: sale.party_snapshot.mobile || "",
        state: sale.party_snapshot.state || "",
      };
      state.taxType = taxType;
      state.selectedPriceLevel = sale.price_level_id
        ? { _id: sale.price_level_id, name: sale.price_level_name || "" }
        : null;
      state.despatchDetails = {
        challanNo: sale.despatch_details.challan_no || "",
        containerNo: sale.despatch_details.container_no || "",
        despatchThrough: sale.despatch_details.despatch_through || "",
        destination: sale.despatch_details.destination || "",
        vehicleNo: sale.despatch_details.vehicle_no || "",
        orderNo: sale.despatch_details.order_no || "",
        termsOfPay: sale.despatch_details.terms_of_pay || "",
        termsOfDelivery: sale.despatch_details.terms_of_delivery || "",
      };

      // `id` is a frontend render/update key. Existing rows use their saved
      // `_id` here so duplicate products never collide in the mobile list.
      state.items = sale.items.map((item) => ({
        _id: item._id,
        id: item._id,
        itemId: item.item_id,
        name: item.item_name,
        hsn: item.hsn || "",
        unit: item.base_unit || item.unit || "",
        baseUnit: item.base_unit || item.unit || "",
        selectedUnit: item.selected_unit || item.base_unit || item.unit || "",
        alternateUnit: item.alternate_unit ?? null,
        baseDenominator: item.base_denominator ?? null,
        altConversion: item.alt_conversion ?? null,
        alternateActualQty: item.alternate_actual_qty ?? null,
        alternateBilledQty: item.alternate_billed_qty ?? null,
        priceLevels: item.priceLevels ?? [],
        priceLevelId: item.price_level_id || null,
        rate: Number(item.rate) || 0,
        ...getSavedSaleItemTaxRates(item.tax_rate),
        cess: Number(item.cess_rate) || 0,
        addlCess: Number(item.addl_cess_rate) || 0,
        taxType,
        initialPriceSource: getSavedInitialPriceSource(
          item.initial_price_source,
        ),
        actualQty: Number(item.actual_qty) || 0,
        billedQty: Number(item.billed_qty) || 0,
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
        godownId: item.godown_id,
        godownName: item.godown_name || "",
        godownStockRowId: item.godown_stock_row_id,
        batch: item.batch ?? null,
        mfgdt: item.mfgdt ?? null,
        expdt: item.expdt ?? null,
        mrp: item.mrp ?? null,
        stockBalance: 0,
        warrantyCardId: item.warranty_card_id ?? null,
      }));
      // These are the rates persisted on the Sale. Additional-charge masters
      // are only used when a user adds a brand-new charge to this draft.
      state.additionalCharges = sale.additional_charges.map((charge) => ({
        additionalChargeId: charge.additional_charge_id ?? null,
        _id: charge._id,
        option: charge.option,
        value: String(charge.value ?? ""),
        action: charge.action === "subtract" ? "subtract" : "add",
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
      }));
      state.narration = sale.narration || "";
      recalculateSaleDraft(state);
    },
    setSaleDate: (state, action: PayloadAction<string>) => {
      if (!draftCanBeEdited(state)) return;
      state.transactionDate = action.payload;
    },
    setSaleSeries: (
      state,
      action: PayloadAction<VoucherSeriesItem | null>,
    ) => {
      if (!draftCanBeEdited(state)) return;
      state.selectedSeries = action.payload;
    },
    setSaleParty: (
      state,
      action: PayloadAction<SetSalePartyPayload>,
    ) => {
      if (!draftCanBeEdited(state)) return;
      state.selectedParty = action.payload.party;
      state.taxType = action.payload.taxType;
      // Party state can switch GST mode, so recalculate both item and charge tax.
      recalculateSaleDraft(state);
    },
    setSalePriceLevel: (state, action: PayloadAction<PriceLevel | null>) => {
      if (!draftCanBeEdited(state)) return;
      state.selectedPriceLevel = action.payload;
    },
    setSaleItems: (state, action: PayloadAction<SaleItem[]>) => {
      if (!draftCanBeEdited(state)) return;
      recalculateSaleDraft(state, action.payload);
    },
    updateSaleItem: (state, action: PayloadAction<SaleItem>) => {
      if (!draftCanBeEdited(state)) return;
      recalculateSaleDraft(
        state,
        state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        ),
      );
    },
    removeSaleItem: (state, action: PayloadAction<string>) => {
      if (!draftCanBeEdited(state)) return;
      recalculateSaleDraft(
        state,
        state.items.filter((item) => item.id !== action.payload),
      );
    },
    setSaleDespatchDetails: (
      state,
      action: PayloadAction<SaleOrderDespatchDetails>,
    ) => {
      if (!draftCanBeEdited(state)) return;
      state.despatchDetails = action.payload;
    },
    setSaleAdditionalCharges: (
      state,
      action: PayloadAction<SaleOrderAdditionalCharge[]>,
    ) => {
      if (!draftCanBeEdited(state)) return;
      state.additionalCharges = action.payload;
      recalculateSaleDraft(state);
    },
    setSaleNarration: (state, action: PayloadAction<string>) => {
      if (!draftCanBeEdited(state)) return;
      state.narration = action.payload;
    },
    setSaleSubmission: (
      state,
      action: PayloadAction<SetSaleSubmissionPayload>,
    ) => {
      // Keep the first exact body until a confirmed response clears the draft.
      state.request_id = action.payload.request_id;
      state.submittedPayload = action.payload.submittedPayload;
      state.submissionRecoveryState = "submitting";
    },
    clearSaleSubmittedPayload: (state) => {
      // A confirmed client-side rejection lets the user correct and resubmit.
      state.submittedPayload = null;
      state.submissionRecoveryState = null;
    },
    setSaleSubmissionRecoveryState: (
      state,
      action: PayloadAction<"submitting" | "uncertain" | "conflict">,
    ) => {
      if (!state.submittedPayload) return;
      state.submissionRecoveryState = action.payload;
    },
    discardSaleEditDraft: (state, action: PayloadAction<string>) => {
      // A route can be removed after another Sale edit starts. Only its own
      // draft is allowed to clear the shared Sale Redux state.
      if (state.editingSaleId !== action.payload) return;
      return initialState;
    },
    resetSaleDraft: () => initialState,
  },
});

export const {
  resetSaleDraft,
  discardSaleEditDraft,
  loadSaleForEdit,
  setSaleDate,
  setSaleParty,
  setSalePriceLevel,
  setSaleDespatchDetails,
  setSaleAdditionalCharges,
  setSaleNarration,
  setSaleSubmission,
  clearSaleSubmittedPayload,
  setSaleSubmissionRecoveryState,
  setSaleItems,
  updateSaleItem,
  removeSaleItem,
  setSaleSeries,
  startSaleDraft,
} = saleDraftSlice.actions;

export default saleDraftSlice.reducer;
