import type { Product, ProductPriceLevel } from "@/types/product";
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
  | "manual"
  | "saved";

export type SaleOrderItem = {
  _id?: string;
  id: string;
  name: string;
  hsn: string;
  unit: string;
  // The mobile UI currently always works in the base unit. These fields keep
  // the item snapshot compatible with the backend's unit contract.
  baseUnit: string;
  selectedUnit: string;
  alternateUnit: string | null;
  baseDenominator: number | null;
  altConversion: number | null;
  alternateActualQty: number | null;
  alternateBilledQty: number | null;
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

export type SaleOrderDetailItem = {
  _id: string;
  item_id: string;
  item_name: string;
  brand?: Product["brand"] | null;
  category?: Product["category"] | null;
  sub_category?: Product["sub_category"] | null;
  priceLevels?: ProductPriceLevel[];
  hsn?: string | null;
  unit?: string | null;
  base_unit?: string | null;
  selected_unit?: string | null;
  alternate_unit?: string | null;
  base_denominator?: number | null;
  alt_conversion?: number | null;
  actual_qty: number;
  billed_qty: number;
  alternate_actual_qty?: number | null;
  alternate_billed_qty?: number | null;
  rate: number;
  tax_rate: number;
  cess_rate: number;
  addl_cess_rate: number;
  tax_inclusive: boolean;
  discount_type: SaleOrderDiscountType;
  discount_percentage: number;
  discount_amount: number;
  base_price: number;
  taxable_amount: number;
  igst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  tax_amount: number;
  cess_amount: number;
  addl_cess_amount: number;
  total_amount: number;
  price_level_id?: string | null;
  initial_price_source?: string | null;
  description?: string | null;
};

export type SaleOrderDetailCharge = {
  _id: string;
  option: string;
  value: number;
  action: AdditionalChargeAction;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  addl_cess: number;
  state_cess: number;
  hsn?: string | null;
  igst_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  tax_amount: number;
  cess_amount?: number;
  addl_cess_amount?: number;
  state_cess_amount?: number;
  final_value: number;
};

export type SaleOrderDetailTotals = {
  sub_total: number;
  total_discount: number;
  taxable_amount: number;
  total_tax_amount: number;
  total_igst_amt: number;
  total_cgst_amt: number;
  total_sgst_amt: number;
  total_cess_amt: number;
  total_addl_cess_amt: number;
  item_total: number;
  total_additional_charge: number;
  total_additional_charge_tax_amount: number;
  total_additional_charge_igst_amt: number;
  total_additional_charge_cgst_amt: number;
  total_additional_charge_sgst_amt: number;
  total_additional_charge_cess_amt: number;
  total_additional_charge_addl_cess_amt: number;
  total_additional_charge_state_cess_amt: number;
  amount_with_additional_charge: number;
  round_off: number;
  final_amount: number;
};

export type SaleOrderPartySnapshot = {
  name: string;
  gst_no?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  mobile?: string | null;
  state?: string | null;
};

export type SaleOrderDetailDespatch = {
  challan_no?: string | null;
  container_no?: string | null;
  despatch_through?: string | null;
  destination?: string | null;
  vehicle_no?: string | null;
  order_no?: string | null;
  terms_of_pay?: string | null;
  terms_of_delivery?: string | null;
};

export type SaleOrderDetail = {
  _id: string;
  cmp_id?: string;
  series_id?: string;
  party_id?: string;
  price_level_id?: string | null;
  voucher_type: "saleOrder";
  voucher_number: string;
  series_name?: string | null;
  date: string;
  status: "open" | "converted" | "cancelled";
  tax_type: SaleTaxType;
  price_level_name?: string | null;
  party_snapshot: SaleOrderPartySnapshot;
  items: SaleOrderDetailItem[];
  additional_charges: SaleOrderDetailCharge[];
  despatch_details: SaleOrderDetailDespatch;
  totals: SaleOrderDetailTotals;
  narration?: string | null;
};
