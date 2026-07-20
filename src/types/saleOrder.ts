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
