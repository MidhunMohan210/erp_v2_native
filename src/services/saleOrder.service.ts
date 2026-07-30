import api from "@/services/api";
import type { Party } from "@/types/party";
import type { PriceLevel } from "@/types/product";
import type {
  SaleOrderAdditionalCharge,
  SaleOrderAdditionalChargeTotals,
  SaleOrderDespatchDetails,
  SaleOrderItem,
  SaleOrderItemTotals,
  SaleOrderDetail,
} from "@/types/saleOrder";
import type {
  SaleTaxType,
  VoucherSeriesItem,
} from "@/types/voucher";

type BuildCreateSaleOrderPayloadInput = {
  companyId: string;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem;
  party: Party;
  taxType: SaleTaxType;
  selectedPriceLevel: PriceLevel | null;
  despatchDetails: SaleOrderDespatchDetails;
  items: SaleOrderItem[];
  itemTotals: SaleOrderItemTotals;
  additionalCharges: SaleOrderAdditionalCharge[];
  additionalChargeTotals: SaleOrderAdditionalChargeTotals;
};

type CreateSaleOrderItemPayload = {
  _id?: string;
  id: string;
  name: string;
  hsn: string;
  unit: string;
  rate: number;
  billedQty: number;
  actualQty: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cessRate: number;
  addlCessRate: number;
  taxType: SaleTaxType;
  basePrice: number;
  discountType: "percentage" | "amount";
  discountPercentage: number;
  discountAmount: number;
  taxableAmount: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  cessAmount: number;
  addlCessAmount: number;
  totalAmount: number;
  taxInclusive: boolean;
  description: string;
};

type CreateSaleOrderAdditionalChargePayload = {
  _id: string;
  option: string;
  value: number;
  action: "add" | "subtract";
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  addl_cess: number;
  state_cess: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  cessAmount: number;
  addlCessAmount: number;
  stateCessAmount: number;
  hsn: string;
  finalValue: number;
};

export type CreateSaleOrderPayload = {
  cmp_id: string;
  cmpId: string;
  transactionDate: string;
  taxType: SaleTaxType;
  tax_type: SaleTaxType;
  selectedSeries: {
    _id: string;
    seriesName: string;
  };
  series_id: string;
  party: Party;
  selectedPriceLevel: {
    _id: string;
    name: string;
  } | null;
  despatchDetails: SaleOrderDespatchDetails;
  items: CreateSaleOrderItemPayload[];
  additionalCharges: CreateSaleOrderAdditionalChargePayload[];
  subTotal: number;
  totalDiscount: number;
  taxableAmount: number;
  total_igst_amt: number;
  total_cgst_amt: number;
  total_sgst_amt: number;
  total_cess_amt: number;
  total_addl_cess_amt: number;
  totalTaxAmount: number;
  total_tax_amount: number;
  item_total: number;
  totalAdditionalCharge: number;
  totalAdditionalChargeTaxAmount: number;
  total_additional_charge_tax_amount: number;
  totalAdditionalChargeIgstAmt: number;
  total_additional_charge_igst_amt: number;
  totalAdditionalChargeCgstAmt: number;
  total_additional_charge_cgst_amt: number;
  totalAdditionalChargeSgstAmt: number;
  total_additional_charge_sgst_amt: number;
  totalAdditionalChargeCessAmt: number;
  total_additional_charge_cess_amt: number;
  totalAdditionalChargeAddlCessAmt: number;
  total_additional_charge_addl_cess_amt: number;
  totalAdditionalChargeStateCessAmt: number;
  total_additional_charge_state_cess_amt: number;
  amountWithAdditionalCharge: number;
  finalAmount: number;
};

export type CreatedSaleOrder = {
  _id: string;
  voucher_number?: string;
};

export type CreateSaleOrderResponse = {
  success: boolean;
  message?: string;
  data?: {
    saleOrder?: CreatedSaleOrder;
  };
};

export type UpdateSaleOrderResponse = {
  success: boolean;
  message?: string;
  data?: {
    saleOrder?: SaleOrderDetail;
  };
};

export type CancelSaleOrderPayload = {
  cmp_id: string;
};

export type CancelSaleOrderResponse = {
  success: boolean;
  message?: string;
  data?: {
    saleOrder?: SaleOrderDetail;
  };
};

export function buildCreateSaleOrderPayload({
  companyId,
  transactionDate,
  selectedSeries,
  party,
  taxType,
  selectedPriceLevel,
  despatchDetails,
  items,
  itemTotals,
  additionalCharges,
  additionalChargeTotals,
}: BuildCreateSaleOrderPayloadInput): CreateSaleOrderPayload {
  return {
    cmp_id: companyId,
    cmpId: companyId,
    transactionDate,
    taxType,
    tax_type: taxType,
    // This is only the series identity. The backend issues the final number.
    selectedSeries: {
      _id: selectedSeries._id,
      seriesName: selectedSeries.seriesName,
    },
    series_id: selectedSeries._id,
    party,
    selectedPriceLevel: selectedPriceLevel
      ? {
          _id: selectedPriceLevel._id,
          name:
            selectedPriceLevel.pricelevel ||
            selectedPriceLevel.name ||
            "",
        }
      : null,
    despatchDetails,
    items: items.map((item) => ({
      _id: item._id,
      id: item.id,
      name: item.name,
      hsn: item.hsn,
      unit: item.unit,
      rate: item.rate,
      billedQty: item.billedQty,
      actualQty: item.actualQty,
      taxRate: item.taxRate,
      cgst: item.cgst,
      sgst: item.sgst,
      igst: item.igst,
      cessRate: item.cess,
      addlCessRate: item.addlCess,
      taxType: item.taxType,
      basePrice: item.basePrice,
      discountType: item.discountType,
      discountPercentage: item.discountPercentage,
      discountAmount: item.discountAmount,
      taxableAmount: item.taxableAmount,
      igstAmount: item.igstAmount,
      cgstAmount: item.cgstAmount,
      sgstAmount: item.sgstAmount,
      taxAmount: item.taxAmount,
      cessAmount: item.cessAmount,
      addlCessAmount: item.addlCessAmount,
      totalAmount: item.totalAmount,
      taxInclusive: item.taxInclusive,
      description: item.description,
    })),
    additionalCharges: additionalCharges.map((charge) => ({
      _id: charge._id,
      option: charge.option,
      value: Number(charge.value) || 0,
      action: charge.action,
      igst: charge.igst,
      cgst: charge.cgst,
      sgst: charge.sgst,
      cess: charge.cess,
      addl_cess: charge.addlCess,
      state_cess: charge.stateCess,
      igstAmount: charge.igstAmount,
      cgstAmount: charge.cgstAmount,
      sgstAmount: charge.sgstAmount,
      taxAmount: charge.taxAmount,
      cessAmount: charge.cessAmount,
      addlCessAmount: charge.addlCessAmount,
      stateCessAmount: charge.stateCessAmount,
      hsn: charge.hsn,
      finalValue: charge.finalValue,
    })),
    subTotal: itemTotals.subTotal,
    totalDiscount: itemTotals.totalDiscount,
    taxableAmount: itemTotals.taxableAmount,
    total_igst_amt: itemTotals.totalIgstAmount,
    total_cgst_amt: itemTotals.totalCgstAmount,
    total_sgst_amt: itemTotals.totalSgstAmount,
    total_cess_amt: itemTotals.totalCessAmount,
    total_addl_cess_amt: itemTotals.totalAddlCessAmount,
    totalTaxAmount: itemTotals.totalTaxAmount,
    total_tax_amount: itemTotals.totalTaxAmount,
    item_total: itemTotals.itemTotal,
    totalAdditionalCharge:
      additionalChargeTotals.totalAdditionalCharge,
    totalAdditionalChargeTaxAmount:
      additionalChargeTotals.totalAdditionalChargeTaxAmount,
    total_additional_charge_tax_amount:
      additionalChargeTotals.totalAdditionalChargeTaxAmount,
    totalAdditionalChargeIgstAmt:
      additionalChargeTotals.totalAdditionalChargeIgstAmount,
    total_additional_charge_igst_amt:
      additionalChargeTotals.totalAdditionalChargeIgstAmount,
    totalAdditionalChargeCgstAmt:
      additionalChargeTotals.totalAdditionalChargeCgstAmount,
    total_additional_charge_cgst_amt:
      additionalChargeTotals.totalAdditionalChargeCgstAmount,
    totalAdditionalChargeSgstAmt:
      additionalChargeTotals.totalAdditionalChargeSgstAmount,
    total_additional_charge_sgst_amt:
      additionalChargeTotals.totalAdditionalChargeSgstAmount,
    totalAdditionalChargeCessAmt:
      additionalChargeTotals.totalAdditionalChargeCessAmount,
    total_additional_charge_cess_amt:
      additionalChargeTotals.totalAdditionalChargeCessAmount,
    totalAdditionalChargeAddlCessAmt:
      additionalChargeTotals.totalAdditionalChargeAddlCessAmount,
    total_additional_charge_addl_cess_amt:
      additionalChargeTotals.totalAdditionalChargeAddlCessAmount,
    totalAdditionalChargeStateCessAmt:
      additionalChargeTotals.totalAdditionalChargeStateCessAmount,
    total_additional_charge_state_cess_amt:
      additionalChargeTotals.totalAdditionalChargeStateCessAmount,
    amountWithAdditionalCharge:
      additionalChargeTotals.amountWithAdditionalCharge,
    finalAmount: additionalChargeTotals.finalAmount,
  };
}

export const saleOrderService = {
  async createSaleOrder(
    payload: CreateSaleOrderPayload,
  ): Promise<CreateSaleOrderResponse> {
    const response = await api.post<CreateSaleOrderResponse>(
      "/api/sale-orders",
      payload,
    );
    return response.data;
  },

  async getSaleOrderById(
    saleOrderId: string,
    cmpId: string,
  ): Promise<SaleOrderDetail> {
    const response = await api.get<{
      success: boolean;
      data: { saleOrder: SaleOrderDetail };
    }>(`/api/sale-orders/${saleOrderId}`, {
      params: { cmpId },
    });

    return response.data.data.saleOrder;
  },

  async updateSaleOrder(
    saleOrderId: string,
    payload: CreateSaleOrderPayload,
  ): Promise<UpdateSaleOrderResponse> {
    const response = await api.put<UpdateSaleOrderResponse>(
      `/api/sale-orders/${saleOrderId}`,
      payload,
    );
    return response.data;
  },

  async cancelSaleOrder(
    saleOrderId: string,
    payload: CancelSaleOrderPayload,
  ): Promise<CancelSaleOrderResponse> {
    // Cancellation preserves the voucher and changes only its server status.
    const response = await api.put<CancelSaleOrderResponse>(
      `/api/sale-orders/${saleOrderId}/cancel`,
      payload,
    );
    return response.data;
  },
};
