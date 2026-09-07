// These types describe the development-only response from GET /api/sales/:saleId/audit.
// Several IDs are strings because the backend converts Mongo IDs before returning them.
export type SaleAuditCheck = {
  valid: boolean;
  expectedEntries?: number;
  actualEntries?: number;
  issues: string[];
};

export type SaleAuditSaleItem = {
  _id: string;
  item_id: string;
  item_name: string;
  actual_qty: number;
  billed_qty: number;
  selected_unit: string;
  godown_id: string;
  godown_name: string;
  godown_stock_row_id: string;
  batch: string | null;
  rate: number;
  total_amount: number;
};

export type SaleAuditData = {
  sale: {
    _id: string;
    voucher_number: string;
    date: string;
    party_id: string;
    party_snapshot?: { party_name?: string; name?: string };
    totals: { final_amount: number };
    status: string;
    tally_status: string;
    items: SaleAuditSaleItem[];
  };
  itemLedgers: {
    _id: string;
    item_id: string;
    voucher_item_id: string;
    movement_type: string;
    base_quantity: number;
    base_unit: string;
    godown_id: string;
    godown_stock_row_id: string;
    batch: string | null;
    status?: string;
    tally_status: string;
    saleItem?: {
      saleItemId: string;
      item_name: string;
      godown_name: string;
    };
  }[];
  itemMonthlyBalances: {
    itemId: string;
    monthKey: string;
    thisSaleContribution: { outwardQuantity: number; transactionCount: number };
    currentMonthlyBalance: {
      total_outward_qty: number;
      transaction_count: number;
    } | null;
  }[];
  partyLedgers: {
    _id: string;
    party_name: string;
    ledger_side: string;
    amount: number;
    voucher_number: string;
    status: string;
    tally_status: string;
  }[];
  partyMonthlyBalances: {
    partyId: string;
    monthKey: string;
    thisSaleContribution: { debit: number; transactionCount: number };
    currentMonthlyBalance: { total_debit: number; transaction_count: number } | null;
  }[];
  outstanding: {
    _id: string;
    bill_no: string;
    bill_amount: number;
    adjustedAmount: number;
    bill_pending_amt: number;
    isCancelled: boolean;
  }[];
  voucherTimeline: {
    _id: string;
    date: string;
    voucher_number: string;
    party_name: string | null;
    amount: number;
    status: string | null;
  }[];
  stockRows: {
    saleItemId: string;
    item_id: string;
    item_name: string;
    godown_stock_row_id: string;
    godown_id: string;
    godown_name: string;
    batch: string | null;
    saleActualQty: number;
    currentStockRow: {
      balance_stock?: number;
      stock?: number;
      stock_balance?: number;
      current_stock?: number;
    } | null;
  }[];
  checks: {
    overallValid: boolean;
    itemLedger: SaleAuditCheck;
    itemMonthlyBalance: SaleAuditCheck;
    partyLedger: SaleAuditCheck;
    partyMonthlyBalance: SaleAuditCheck;
    outstanding: SaleAuditCheck;
    references: SaleAuditCheck;
    stockRows: SaleAuditCheck;
  };
};

export type SaleAuditResponse = {
  success: boolean;
  message?: string;
  data: SaleAuditData;
};

export type SaleAuditListItem = {
  _id: string;
  voucher_number?: string;
  date?: string;
  party_name?: string | null;
  amount?: number;
  status?: string | null;
};

export type SaleAuditListResponse = {
  page: number;
  hasMore: boolean;
  vouchers: SaleAuditListItem[];
};
