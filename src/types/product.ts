export type ProductPriceLevel = {
  priceLevel?: string | { _id?: string };
  priceRate?: number;
  priceDisc?: number;
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
  unit?: string;
  hsn_code?: string;
  hsn?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  addl_cess?: number;
  state_cess?: number;
  priceLevels?: ProductPriceLevel[];
  brand?: string | { brand?: string };
  category?: string | { category?: string };
  sub_category?: string | { subcategory?: string };
};

export type ProductListResponse = {
  items: Product[];
  page: number;
  hasMore: boolean;
  total?: number;
  limit?: number;
};
