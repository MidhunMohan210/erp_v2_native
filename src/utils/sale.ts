import type { Product, ProductGodownStockRow } from "@/types/product";
import type { SaleItem } from "@/types/sale";
import type { SaleOrderItemTotals, SaleOrderPriceSource } from "@/types/saleOrder";
import type { SaleTaxType } from "@/types/voucher";
import { calculateSaleOrderItems, createSaleOrderItem } from "@/utils/saleOrder";

export function getStockRowId(row: ProductGodownStockRow): string {
  return row._id || "";
}

export function getGodownSnapshot(row: ProductGodownStockRow): {
  id: string;
  name: string;
} {
  if (typeof row.godown === "string") return { id: row.godown, name: "" };
  return { id: row.godown?._id || "", name: row.godown?.godown || row.godown?.name || "" };
}

export function getReservedActualQty(
  items: SaleItem[],
  stockRowId: string,
  excludedLineId = "",
): number {
  return items.reduce(
    (total, item) =>
      item.godownStockRowId === stockRowId && item.id !== excludedLineId
        ? total + Number(item.actualQty || 0)
        : total,
    0,
  );
}

export function getRemainingStock(
  row: ProductGodownStockRow,
  items: SaleItem[],
  excludedLineId = "",
): number {
  return Number(row.balance_stock || 0) - getReservedActualQty(
    items,
    getStockRowId(row),
    excludedLineId,
  );
}

type CreateSaleItemOptions = {
  rate: number;
  priceSource: SaleOrderPriceSource;
  priceLevelId: string | null;
  taxType: SaleTaxType;
};

export function createSaleItem(
  product: Product,
  row: ProductGodownStockRow,
  options: CreateSaleItemOptions,
): SaleItem {
  const baseItem = createSaleOrderItem(product, options);
  const itemId = baseItem.id;
  const godown = getGodownSnapshot(row);
  return {
    ...baseItem,
    // A product can occur multiple times from different stock rows.
    id: `${itemId}-${getStockRowId(row)}-${Date.now()}`,
    itemId,
    godownId: godown.id,
    godownName: godown.name,
    godownStockRowId: getStockRowId(row),
    batch: row.batch || null,
    mfgdt: row.mfgdt || null,
    expdt: row.expdt || null,
    mrp: row.mrp ?? null,
    stockBalance: Number(row.balance_stock || 0),
    warrantyCardId: null,
  };
}

export function hasSameSaleConfiguration(left: SaleItem, right: SaleItem): boolean {
  // A fixed discount amount belongs to one line total. Do not merge it unless
  // it is zero, because retaining one amount would silently under-discount.
  if (
    (left.discountType === "amount" && left.discountAmount !== 0) ||
    (right.discountType === "amount" && right.discountAmount !== 0)
  ) {
    return false;
  }

  return (
    left.itemId === right.itemId &&
    left.godownStockRowId === right.godownStockRowId &&
    left.selectedUnit === right.selectedUnit &&
    left.baseUnit === right.baseUnit &&
    left.alternateUnit === right.alternateUnit &&
    left.baseDenominator === right.baseDenominator &&
    left.altConversion === right.altConversion &&
    left.rate === right.rate &&
    left.priceLevelId === right.priceLevelId &&
    left.initialPriceSource === right.initialPriceSource &&
    left.discountType === right.discountType &&
    left.discountPercentage === right.discountPercentage &&
    left.discountAmount === right.discountAmount &&
    left.taxRate === right.taxRate &&
    left.cess === right.cess &&
    left.addlCess === right.addlCess &&
    left.taxInclusive === right.taxInclusive &&
    left.description === right.description &&
    left.warrantyCardId === right.warrantyCardId
  );
}

export function mergeSaleItem(items: SaleItem[], nextItem: SaleItem, taxType: SaleTaxType): SaleItem[] {
  const matchingItem = items.find((item) => hasSameSaleConfiguration(item, nextItem));
  if (!matchingItem) return calculateSaleItems([...items, nextItem], taxType).items;

  return calculateSaleItems(
    items.map((item) =>
      item.id === matchingItem.id
        ? {
            ...item,
            actualQty: item.actualQty + nextItem.actualQty,
            billedQty: item.billedQty + nextItem.billedQty,
            alternateActualQty:
              item.alternateActualQty == null || nextItem.alternateActualQty == null
                ? null
                : item.alternateActualQty + nextItem.alternateActualQty,
            alternateBilledQty:
              item.alternateBilledQty == null || nextItem.alternateBilledQty == null
                ? null
                : item.alternateBilledQty + nextItem.alternateBilledQty,
          }
        : item,
    ),
    taxType,
  ).items;
}

export function calculateSaleItems(items: SaleItem[], taxType: SaleTaxType): {
  items: SaleItem[];
  totals: SaleOrderItemTotals;
} {
  const result = calculateSaleOrderItems(items, taxType);
  return { items: result.items as SaleItem[], totals: result.totals };
}
