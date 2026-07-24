import type { Product, ProductPriceLevel } from "@/types/product";
import type {
  SaleOrderItem,
  SaleOrderItemTotals,
  SaleOrderPriceSource,
} from "@/types/saleOrder";
import type { SaleTaxType } from "@/types/voucher";

function toNumber(value: number | string | undefined): number {
  return Number(value) || 0;
}

export function getProductId(product: Product): string {
  return product._id || "";
}

function getPriceLevelId(priceLevel?: ProductPriceLevel["priceLevel"]): string {
  return typeof priceLevel === "string" ? priceLevel : priceLevel?._id || "";
}

export function getProductPriceLevelRate(
  product: Product,
  priceLevelId: string,
): number | null {
  if (!priceLevelId) return null;

  const matchingRate = product.priceLevels?.find(
    (item) => getPriceLevelId(item.priceLevel) === priceLevelId,
  );
  return matchingRate?.priceRate == null
    ? null
    : toNumber(matchingRate.priceRate);
}

export function calculateSaleOrderItem(
  item: SaleOrderItem,
  taxType: SaleTaxType,
): SaleOrderItem {
  const billedQty = toNumber(item.billedQty);
  const rate = toNumber(item.rate);
  const lineTotal = rate * billedQty;
  const gstRate =
    taxType === "cgst_sgst"
      ? toNumber(item.cgst) + toNumber(item.sgst)
      : toNumber(item.igst);

  // Tax-inclusive rates must be reduced to their pre-GST value before discount.
  const taxInclusiveDivisor = 1 + gstRate / 100;
  const basePrice =
    item.taxInclusive && taxInclusiveDivisor !== 0
      ? lineTotal / taxInclusiveDivisor
      : lineTotal;
  const requestedDiscount =
    item.discountType === "percentage"
      ? (basePrice * toNumber(item.discountPercentage)) / 100
      : toNumber(item.discountAmount);
  const discountAmount = Math.min(Math.max(requestedDiscount, 0), basePrice);
  const discountPercentage =
    item.discountType === "percentage"
      ? toNumber(item.discountPercentage)
      : basePrice > 0
        ? (discountAmount / basePrice) * 100
        : 0;
  const taxableAmount = Math.max(basePrice - discountAmount, 0);
  const igstAmount =
    taxType === "igst" ? taxableAmount * (toNumber(item.igst) / 100) : 0;
  const cgstAmount =
    taxType === "cgst_sgst"
      ? taxableAmount * (toNumber(item.cgst) / 100)
      : 0;
  const sgstAmount =
    taxType === "cgst_sgst"
      ? taxableAmount * (toNumber(item.sgst) / 100)
      : 0;
  const taxAmount = igstAmount + cgstAmount + sgstAmount;
  const cessAmount = taxableAmount * (toNumber(item.cess) / 100);
  const addlCessAmount = billedQty * toNumber(item.addlCess);

  return {
    ...item,
    billedQty,
    rate,
    taxType,
    taxRate: gstRate,
    discountPercentage,
    discountAmount,
    basePrice,
    taxableAmount,
    igstAmount,
    cgstAmount,
    sgstAmount,
    taxAmount,
    cessAmount,
    addlCessAmount,
    // Keep the complete calculated value; voucher amounts are not rounded.
    totalAmount: taxableAmount + taxAmount + cessAmount + addlCessAmount,
  };
}

export function calculateSaleOrderItems(
  items: SaleOrderItem[],
  taxType: SaleTaxType,
): { items: SaleOrderItem[]; totals: SaleOrderItemTotals } {
  const calculatedItems = items.map((item) =>
    calculateSaleOrderItem(item, taxType),
  );
  const startingTotals: SaleOrderItemTotals = {
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
  const totals = calculatedItems.reduce(
    (current, item) => ({
      subTotal: current.subTotal + item.basePrice,
      totalDiscount: current.totalDiscount + item.discountAmount,
      taxableAmount: current.taxableAmount + item.taxableAmount,
      totalIgstAmount: current.totalIgstAmount + item.igstAmount,
      totalCgstAmount: current.totalCgstAmount + item.cgstAmount,
      totalSgstAmount: current.totalSgstAmount + item.sgstAmount,
      totalCessAmount: current.totalCessAmount + item.cessAmount,
      totalAddlCessAmount:
        current.totalAddlCessAmount + item.addlCessAmount,
      totalTaxAmount: current.totalTaxAmount + item.taxAmount,
      itemTotal: current.itemTotal + item.totalAmount,
    }),
    startingTotals,
  );

  return {
    items: calculatedItems,
    // Aggregate the full item values without rounding the voucher totals.
    totals,
  };
}

type CreateSaleOrderItemOptions = {
  rate: number;
  priceSource: SaleOrderPriceSource;
  priceLevelId: string | null;
  taxType: SaleTaxType;
};

export function createSaleOrderItem(
  product: Product,
  options: CreateSaleOrderItemOptions,
): SaleOrderItem {
  const item: SaleOrderItem = {
    id: getProductId(product),
    name: product.product_name || product.name || "Untitled Product",
    hsn: product.hsn || product.hsn_code || "",
    unit: product.unit || "",
    priceLevels: product.priceLevels ?? [],
    priceLevelId: options.priceLevelId,
    rate: options.rate,
    taxRate: 0,
    cgst: toNumber(product.cgst),
    sgst: toNumber(product.sgst),
    igst: toNumber(product.igst),
    cess: toNumber(product.cess),
    addlCess: toNumber(product.addl_cess),
    taxType: options.taxType,
    initialPriceSource: options.priceSource,
    actualQty: 1,
    billedQty: 1,
    taxInclusive: false,
    discountType: "percentage",
    discountPercentage: 0,
    discountAmount: 0,
    description: "",
    basePrice: 0,
    taxableAmount: 0,
    igstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    taxAmount: 0,
    cessAmount: 0,
    addlCessAmount: 0,
    totalAmount: 0,
  };

  return calculateSaleOrderItem(item, options.taxType);
}
