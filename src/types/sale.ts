import type { Party } from "@/types/party";
import type { PriceLevel } from "@/types/product";
import type { SaleOrderItem, SaleOrderItemTotals } from "@/types/saleOrder";
import type { SaleTaxType, VoucherSeriesItem } from "@/types/voucher";

// Sale lines extend the existing calculation shape with the inventory snapshot
// required by the Sale model. `id` is a unique draft-line ID; `itemId` is the
// product ID and must not be used as a unique line key.
export type SaleItem = SaleOrderItem & {
  itemId: string;
  godownId: string;
  godownName: string;
  godownStockRowId: string;
  batch: string | null;
  mfgdt: string | null;
  expdt: string | null;
  mrp: number | null;
  // Snapshot used only for local draft reservation; the server remains stock truth.
  stockBalance: number;
  warrantyCardId: string | null;
};

export type SaleDraft = {
  companyId: string;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem | null;
  selectedParty: Party | null;
  taxType: SaleTaxType;
  selectedPriceLevel: PriceLevel | null;
  items: SaleItem[];
  itemTotals: SaleOrderItemTotals;
};
