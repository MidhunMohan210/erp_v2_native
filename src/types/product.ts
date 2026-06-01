export type Product = {
  _id?: string;
  product_master_id?: string;
  product_name?: string;
  product_code?: string;
  unit?: string;
  hsn_code?: string;
};

export type ProductListResponse = {
  items: Product[];
  page: number;
  hasMore: boolean;
  total?: number;
  limit?: number;
};
