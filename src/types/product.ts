export type ProductPriceLevel = {
  priceLevel?: string | { _id?: string };
  priceRate?: number;
  priceDisc?: number;
};

// A product stock row is the exact inventory source used by a Sale line.
// `godown` can be either the older raw id or a populated godown document.
export type ProductGodownStockRow = {
  _id?: string;
  godown?: string | { _id?: string; godown?: string; name?: string };
  balance_stock?: number;
  batch?: string | null;
  mfgdt?: string | null;
  expdt?: string | null;
  mrp?: number | null;
};

export type PriceLevel = {
  _id: string;
  pricelevel?: string;
  name?: string;
};

export type ProductFilterOption = {
  id: string;
  label: string;
  categoryId?: string;
};

export type Product = {
  _id?: string;
  id?: string;
  product_master_id?: string;
  product_name?: string;
  name?: string;
  product_code?: string;
  // `unit` is kept for product records returned by older API versions.
  unit?: string;
  base_unit?: string;
  alt_unit?: string | null;
  base_denominator?: number | null;
  alt_conversion?: number | null;
  hsn_code?: string;
  hsn?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  addl_cess?: number;
  state_cess?: number;
  priceLevels?: ProductPriceLevel[];
  GodownList?: ProductGodownStockRow[];
  brand?: string | { _id?: string; brand?: string; brand_id?: string };
  category?: string | { _id?: string; category?: string; category_id?: string };
  sub_category?: string | {
    _id?: string;
    subcategory?: string;
    subcategory_id?: string;
  };
};

export type ProductListResponse = {
  items: Product[];
  page: number;
  hasMore: boolean;
  total?: number;
  limit?: number;
};
