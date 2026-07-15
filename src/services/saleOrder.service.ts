import api from "@/services/api";
import type { Party } from "@/types/party";
import type { Product } from "@/types/product";
import type { VoucherSeriesItem } from "@/types/voucher";

export type CreateSimpleSaleOrderPayload = {
  cmp_id: string;
  date: string;
  party: Party;
  product: Product;
  selectedSeries: VoucherSeriesItem;
  quantity: number;
  rate: number;
};

export const saleOrderService = {
  async createSimpleSaleOrder(
    payload: CreateSimpleSaleOrderPayload,
  ): Promise<unknown> {
    const quantity = Number(payload.quantity) || 0;
    const rate = Number(payload.rate) || 0;
    const lineAmount = quantity * rate;

    const requestPayload = {
      cmp_id: payload.cmp_id,
      cmpId: payload.cmp_id,
      date: payload.date,
      taxType: "igst",
      tax_type: "igst",
      selectedSeries: {
        _id: payload.selectedSeries._id,
        seriesName: payload.selectedSeries.seriesName,
      },
      party: payload.party,
      items: [
        {
          _id: payload.product._id,
          id: payload.product._id,
          name: payload.product.product_name || "",
          hsn: payload.product.hsn_code || "",
          unit: payload.product.unit || "",
          rate,
          billedQty: quantity,
          actualQty: quantity,
          taxRate: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          cessRate: 0,
          addlCessRate: 0,
          taxType: "igst",
          basePrice: rate,
          discountType: "amount",
          discountPercentage: 0,
          discountAmount: 0,
          taxableAmount: lineAmount,
          igstAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          taxAmount: 0,
          cessAmount: 0,
          addlCessAmount: 0,
          totalAmount: lineAmount,
          taxInclusive: false,
          description: "",
        },
      ],
      additionalCharges: [],
      totals: {
        subTotal: lineAmount,
        totalDiscount: 0,
        taxableAmount: lineAmount,
        totalTaxAmount: 0,
        totalIgstAmt: 0,
        totalCgstAmt: 0,
        totalSgstAmt: 0,
        totalCessAmt: 0,
        totalAddlCessAmt: 0,
        itemTotal: lineAmount,
        totalAdditionalCharge: 0,
        totalAdditionalChargeTaxAmount: 0,
        totalAdditionalChargeIgstAmt: 0,
        totalAdditionalChargeCgstAmt: 0,
        totalAdditionalChargeSgstAmt: 0,
        totalAdditionalChargeCessAmt: 0,
        totalAdditionalChargeAddlCessAmt: 0,
        totalAdditionalChargeStateCessAmt: 0,
        amountWithAdditionalCharge: lineAmount,
        finalAmount: lineAmount,
      },
    };

    const response = await api.post("/sale-orders", requestPayload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },
};
