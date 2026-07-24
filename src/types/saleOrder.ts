import type { ProductPriceLevel } from "@/types/product";
import type { SaleTaxType } from "@/types/voucher";

export type SaleOrderDespatchDetails = {
  challanNo: string;
  containerNo: string;
  despatchThrough: string;
  destination: string;
  vehicleNo: string;
  orderNo: string;
  termsOfPay: string;
  termsOfDelivery: string;
};

export type SaleOrderDiscountType = "percentage" | "amount";

export type SaleOrderPriceSource =
  | "priceLevel"
  | "lsp"
  | "gsp"
  | "manual";

export type SaleOrderItem = {
  id: string;
  name: string;
  hsn: string;
  unit: string;
  priceLevels: ProductPriceLevel[];
  priceLevelId: string | null;
  rate: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  addlCess: number;
  taxType: SaleTaxType;
  initialPriceSource: SaleOrderPriceSource;
  actualQty: number;
  billedQty: number;
  taxInclusive: boolean;
  discountType: SaleOrderDiscountType;
  discountPercentage: number;
  discountAmount: number;
  description: string;
  basePrice: number;
  taxableAmount: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  cessAmount: number;
  addlCessAmount: number;
  totalAmount: number;
};

export type SaleOrderItemTotals = {
  subTotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalIgstAmount: number;
  totalCgstAmount: number;
  totalSgstAmount: number;
  totalCessAmount: number;
  totalAddlCessAmount: number;
  totalTaxAmount: number;
  itemTotal: number;
};

export type AdditionalChargeAction = "add" | "subtract";

export type AdditionalChargeMaster = {
  _id: string;
  name: string;
  hsn?: string;
  igst?: number;
  cgst?: number;
  sgst?: number;
  cess?: number;
  addl_cess?: number;
  state_cess?: number;
};

export type SaleOrderAdditionalCharge = {
  _id: string;
  option: string;
  value: string;
  action: AdditionalChargeAction;
  hsn: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  addlCess: number;
  stateCess: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  cessAmount: number;
  addlCessAmount: number;
  stateCessAmount: number;
  finalValue: number;
};

export type SaleOrderAdditionalChargeTotals = {
  totalAdditionalCharge: number;
  totalAdditionalChargeTaxAmount: number;
  totalAdditionalChargeIgstAmount: number;
  totalAdditionalChargeCgstAmount: number;
  totalAdditionalChargeSgstAmount: number;
  totalAdditionalChargeCessAmount: number;
  totalAdditionalChargeAddlCessAmount: number;
  totalAdditionalChargeStateCessAmount: number;
  amountWithAdditionalCharge: number;
  finalAmount: number;
};
