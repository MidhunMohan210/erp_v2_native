export type OutstandingClassification = "dr" | "cr" | string;

// These fields are the exact projection returned by the outstanding endpoint.
// A source voucher ID is not returned, so the mobile app cannot safely link a bill.
export type OutstandingBill = {
  _id: string;
  bill_no?: string;
  bill_date?: string;
  bill_amount?: number;
  bill_pending_amt?: number;
  classification?: OutstandingClassification;
  // billId identifies the source voucher when this Outstanding row came from one.
  billId?: string;
  source?: string | null;
};

export type OutstandingBillsResponse = {
  items: OutstandingBill[];
  total: number;
  page: number;
  hasMore: boolean;
};
