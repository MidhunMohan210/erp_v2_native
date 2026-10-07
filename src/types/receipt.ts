import type { OutstandingBill } from "./outstanding";

export type ReceiptInstrumentType =
  | "cash"
  | "cheque"
  | "upi"
  | "neft"
  | "rtgs";

export type ReceiptStatus = "active" | "cancelled";

export type ReceiptCashBankType = "cash" | "bank";

export type ReceiptAllocation = {
  outstandingId: string;
  settledAmount: number;
  // Saved when allocation is confirmed so the first Save can detect a bill
  // whose authoritative pending amount changed in the meantime.
  confirmedPendingAmount?: number;
  billNumber?: string;
  billDate?: string;
};

export type ReceiptSettlementRequestRow = {
  outstanding: string;
  settled_amount: number;
};

// This UI-only type keeps a bill beside its calculated allocation.
// The create API still receives only the Outstanding id and settled amount.
export type ReceiptAllocatedBill = {
  bill: OutstandingBill;
  selected: boolean;
  settledAmount: number;
  remainingAmount: number;
};

export type CreateReceiptRequest = {
  cmp_id: string;
  request_id: string;
  voucher_type: "receipt";
  series_id: string;
  date: string;
  party_id: string;
  party_name: string;
  cash_bank_id: string;
  cash_bank_name: string;
  cash_bank_type: ReceiptCashBankType;
  instrument_type: ReceiptInstrumentType;
  amount: number;
  settlement_details: ReceiptSettlementRequestRow[];
  narration: string | null;
  cheque_number: string | null;
  cheque_date: string | null;
};

export type ReceiptSettlementDetail = {
  _id: string;
  outstanding: string;
  outstanding_number: string;
  outstanding_date: string;
  outstanding_type: "dr" | "cr";
  previous_outstanding_amount: number;
  settled_amount: number;
  remaining_outstanding_amount: number;
  settlement_date: string;
};

export type ReceiptEditAllocationMode = "snapshot" | "reallocation";

// The backend adds these fields to its normal Outstanding projection only for
// Receipt Edit. `editable_available` is the maximum the Edit UI may allocate.
export type ReceiptEditAvailabilityItem = OutstandingBill & {
  current_pending: number;
  original_settled_amount: number;
  editable_available: number;
  originally_allocated: boolean;
};

export type ReceiptEditAvailability = {
  receipt_id: string;
  party_id: string;
  party_name: string;
  expected_updated_at: string;
  original_allocations: ReceiptSettlementRequestRow[];
  items: ReceiptEditAvailabilityItem[];
};

export type UpdateReceiptRequest = {
  expected_updated_at: string;
  date: string;
  amount: number;
  cash_bank_id: string;
  cash_bank_type: ReceiptCashBankType;
  instrument_type: ReceiptInstrumentType;
  settlement_details: ReceiptSettlementRequestRow[];
  narration: string | null;
  cheque_number: string | null;
  cheque_date: string | null;
};

export type ReceiptDetail = {
  _id: string;
  cmp_id: string;
  request_id: string;
  voucher_type: "receipt";
  series_id: string;
  series_name: string;
  voucher_number: string;
  company_level_serial_number: number | null;
  user_level_serial_number: number | null;
  date: string;
  party_id: string;
  party_name: string;
  cash_bank_id: string;
  cash_bank_name: string;
  cash_bank_type: ReceiptCashBankType;
  instrument_type: ReceiptInstrumentType;
  amount: number;
  advance_amount: number;
  settlement_details: ReceiptSettlementDetail[];
  narration: string | null;
  cheque_number: string | null;
  cheque_date: string | null;
  status: ReceiptStatus;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateReceiptResponse = {
  success: true;
  idempotent_replay: boolean;
  data: {
    cashTransaction: ReceiptDetail;
  };
};

export type ReceiptSubmissionRecoveryState =
  | "submitting"
  | "uncertain"
  | "conflict";

export type ReceiptSubmissionRecovery = {
  version: 1;
  userId: string;
  companyId: string;
  seriesName: string;
  payload: CreateReceiptRequest;
  state: ReceiptSubmissionRecoveryState;
  savedAt: string;
};

export type CancelReceiptRequest = {
  cmp_id: string;
  cancellation_reason?: string | null;
};

export type CancelReceiptResponse = {
  success: true;
  message: string;
  data: {
    cashTransaction: ReceiptDetail;
  };
};

export type UpdateReceiptResponse = {
  success: true;
  message: string;
  data: {
    cashTransaction: ReceiptDetail;
  };
};
