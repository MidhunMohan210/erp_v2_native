export type ReceiptAuditCheck = {
  valid: boolean;
  expectedEntries: number;
  actualEntries: number;
  issues: string[];
};

export type ReceiptAuditData = {
  receipt: {
    _id: string;
    request_id: string | null;
    voucher_number: string;
    voucher_type: "receipt";
    date: string;
    party_id: string;
    party_name: string;
    cash_bank_name: string;
    amount: number;
    advance_amount: number;
    status: "active" | "cancelled";
  };
  partyLedgers: Array<{ _id: string; amount: number; ledger_side: string; status: string; party_name: string }>;
  cashBankLedgers: Array<{ _id: string; amount: number; direction: string; status: string; cash_bank_name: string }>;
  partyMonthlyBalance: { month_key: string; total_credit: number; transaction_count: number } | null;
  settlements: Array<{ outstanding_id: string; outstanding_number: string; settled_amount: number; remaining_outstanding_amount: number; current_pending_amount: number | null; valid: boolean; issues: string[] }>;
  advanceOutstanding: Array<{ _id: string; bill_amount: number; bill_pending_amt: number; isCancelled: boolean }>;
  voucherTimeline: Array<{ _id: string; voucher_number: string; status: string; amount: number }>;
  checks: {
    overallValid: boolean;
    partyLedger: ReceiptAuditCheck;
    cashBankLedger: ReceiptAuditCheck;
    partyMonthlyBalance: ReceiptAuditCheck;
    settlements: ReceiptAuditCheck;
    advanceOutstanding: ReceiptAuditCheck;
    references: ReceiptAuditCheck;
    voucherIdentity: ReceiptAuditCheck;
  };
  audit: { healthy: boolean; state: string; issues: string[] };
};

export type ReceiptAuditResponse = { success: true; data: ReceiptAuditData };

export type ReceiptAuditListItem = {
  _id: string;
  voucher_number?: string;
  party_name?: string;
  date?: string;
  amount?: number;
  status?: string;
};

export type ReceiptAuditListResponse = { page: number; hasMore: boolean; vouchers: ReceiptAuditListItem[] };
