import type { Party } from "@/types/party";
import type { SaleTaxType, VoucherSeriesItem } from "@/types/voucher";

// This is only the confirmed header data needed before Sale item entry exists.
// Sale items have their own future type because they require stock-row details.
export type SaleDraft = {
  companyId: string;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem | null;
  selectedParty: Party | null;
  taxType: SaleTaxType;
};
