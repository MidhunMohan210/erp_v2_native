import type { Party } from "@/types/party";
import type { PriceLevel } from "@/types/product";
import type {
  SaleOrderAdditionalCharge,
  SaleOrderAdditionalChargeTotals,
  SaleOrderDetail,
  SaleOrderDetailItem,
  SaleOrderDespatchDetails,
  SaleOrderItem,
  SaleOrderItemTotals,
} from "@/types/saleOrder";
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
  // Snapshot of the selected stock row; it never caps Sale quantity.
  stockBalance: number;
  warrantyCardId: string | null;
};

export type SaleDraft = {
  companyId: string;
  // The backend uses this exact field name to deduplicate one logical Sale submission.
  request_id: string | null;
  // A JSON snapshot of the first submitted payload, excluding `request_id`.
  // It prevents a changed draft from being retried against a first-request-wins backend.
  submittedPayloadSignature: string | null;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem | null;
  selectedParty: Party | null;
  taxType: SaleTaxType;
  selectedPriceLevel: PriceLevel | null;
  items: SaleItem[];
  itemTotals: SaleOrderItemTotals;
  despatchDetails: SaleOrderDespatchDetails;
  additionalCharges: SaleOrderAdditionalCharge[];
  additionalChargeTotals: SaleOrderAdditionalChargeTotals;
  narration: string;
};

/** The persisted Sale shape returned by POST /api/sales for the detail screen. */
export type SaleDetailItem = SaleOrderDetailItem & {
  godown_id: string;
  godown_name: string;
  godown_stock_row_id: string;
  batch?: string | null;
  mfgdt?: string | null;
  expdt?: string | null;
  mrp?: number | null;
};

export type SaleDetail = Omit<
  SaleOrderDetail,
  "voucher_type" | "status" | "items"
> & {
  voucher_type: "sale";
  status: "active" | "cancelled";
  tally_status?: "pending" | "accepted";
  mailing_name?: string | null;
  items: SaleDetailItem[];
};
