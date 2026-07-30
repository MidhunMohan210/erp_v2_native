export type PrintVoucherType = "sale_order";

export type SaleOrderPrintConfig = {
  print_title: string;
  show_print_title: boolean;
  enable_company_details: boolean;
  enable_discount_column: boolean;
  enable_discount_amount: boolean;
  enable_hsn: boolean;
  enable_tax_percentage: boolean;
  enable_incl_tax_rate: boolean;
  enable_tax_analysis: boolean;
  enable_stock_wise_tax_amount: boolean;
  enable_tax_amount: boolean;
  enable_terms_conditions: boolean;
  enable_bank_details: boolean;
  enable_rate: boolean;
  enable_quantity: boolean;
  enable_stock_wise_amount: boolean;
  enable_net_amount: boolean;
};

// Partial makes every field optional because each save sends only changed settings.
export type SaleOrderPrintConfigPatch = Partial<SaleOrderPrintConfig>;

export type PrintConfigurationResponse = {
  cmp_id: string;
  voucher_type: PrintVoucherType;
  config: SaleOrderPrintConfig;
};
