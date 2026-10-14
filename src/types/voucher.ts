export type VoucherType = "saleOrder" | "receipt" | "sale";

// Backend acknowledgement metadata. A missing value is deliberately not treated
// as pending because modifying an unverified voucher could bypass Tally rules.
export type TallyRef = {
  tally_status: "pending" | "accepted";
  tally_voucher_id: string | null;
  tally_accepted_at: string | null;
};

export type SaleTaxType = "igst" | "cgst_sgst";

export type VoucherSeriesItem = {
  _id: string;
  seriesName: string;
  prefix?: string;
  suffix?: string;
  currentNumber?: number;
  widthOfNumericalPart?: number;
  isDefault?: boolean;
  currentlySelected?: boolean;
};

export type VoucherSeriesResponse = {
  voucherSeriesId?: string;
  series: VoucherSeriesItem[];
};

export type VoucherListItem = {
  _id: string;
  voucher_type: string;
  date?: string;
  voucher_number?: string;
  party_name?: string | null;
  amount?: number;
  status?: string | null;
  // Daybook uses the backend's flat projection, unlike voucher detail APIs.
  tally_status?: "pending" | "accepted";
};

export type VoucherListResponse = {
  from?: string;
  to?: string;
  page: number;
  limit: number;
  hasMore: boolean;
  count?: number;
  vouchers: VoucherListItem[];
};

export type VoucherTotalsSummary = {
  date: string;
  totals: {
    saleOrder: number;
    receipt: number;
  };
};

export type DaybookVoucherType = VoucherType | "all";

export type DaybookFilters = {
  from: string;
  to: string;
  voucherTypes: VoucherType[];
};

export type VoucherSeriesPayload = {
  voucherType: VoucherType;
  seriesName: string;
  prefix: string;
  suffix: string;
  widthOfNumericalPart: number;
};

export type CreateVoucherSeriesPayload = VoucherSeriesPayload & {
  currentNumber: number;
};
