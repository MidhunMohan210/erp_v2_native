// This mirrors the development-only POST /api/dev/reset-sales response.
export type SaleResetResponse = {
  success: boolean;
  companyId: string;
  deleted: {
    sales: number;
    itemLedgers: number;
    partyLedgers: number;
    outstanding: number;
    voucherTimeline: number;
  };
  rebuilt: {
    itemMonthlyBalances: {
      updated: number;
      deletedEmpty: number;
    };
    partyMonthlyBalances: {
      updated: number;
      deletedEmpty: number;
    };
  };
  stockReset: {
    productsAffected: number;
    stockRowsAffected: number;
    stockValueSetTo: number;
  };
};
