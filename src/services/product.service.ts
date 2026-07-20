import { isAxiosError } from "axios";

import api from "@/services/api";
import type {
  PriceLevel,
  Product,
  ProductFilterOption,
  ProductListResponse,
} from "@/types/product";

type GetProductsParams = {
  page: number;
  limit?: number;
  cmp_id: string;
  search?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  signal?: AbortSignal;
};

type ProductMasterItem = {
  _id?: string;
  id?: string;
  brand_id?: string;
  category_id?: string;
  subcategory_id?: string;
  brand?: string;
  category?: string | { _id?: string; id?: string };
  subcategory?: string;
  label?: string;
  name?: string;
};

type ProductMasterResponse =
  | ProductMasterItem[]
  | {
      items?: ProductMasterItem[];
      item?: ProductMasterItem[] | { items?: ProductMasterItem[] };
      data?: ProductMasterItem[] | { items?: ProductMasterItem[] };
    };

type ProductDetailResponse =
  | Product
  | { item: Product }
  | { data: Product };

type PricingValue =
  | number
  | { rate?: number; price?: number; lsp?: number };

type PricingResponse =
  | PricingValue
  | { item?: PricingValue; data?: PricingValue };

function getProductDetail(data: ProductDetailResponse): Product {
  if ("item" in data) return data.item;
  if ("data" in data) return data.data;
  return data;
}

function getPricingRate(data: PricingResponse): number | null {
  if (typeof data === "number") return data;
  if ("rate" in data || "price" in data || "lsp" in data) {
    const rate = data.rate ?? data.price ?? data.lsp;
    return rate == null ? null : Number(rate);
  }
  if ("item" in data || "data" in data) {
    const wrappedValue = data.item ?? data.data;
    return wrappedValue == null ? null : getPricingRate(wrappedValue);
  }

  return null;
}

function isMissingOptionalPricing(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    (error.response?.status === 400 || error.response?.status === 404)
  );
}

function getMasterItems(data: ProductMasterResponse): ProductMasterItem[] {
  if (Array.isArray(data)) return data;
  if ("item" in data) {
    if (Array.isArray(data.item)) return data.item;
    return data.item?.items ?? [];
  }
  if ("data" in data) {
    if (Array.isArray(data.data)) return data.data;
    return data.data?.items ?? [];
  }
  return data.items ?? [];
}

function getCategoryId(category: ProductMasterItem["category"]): string | undefined {
  if (typeof category === "string") return category;
  return category?._id ?? category?.id;
}

function mapMasterOptions(
  data: ProductMasterResponse,
  type: "brand" | "category" | "subcategory",
): ProductFilterOption[] {
  return getMasterItems(data)
    .map((item) => {
      const id =
        item._id ??
        item.id ??
        item.brand_id ??
        item.category_id ??
        item.subcategory_id ??
        "";
      const typeLabel =
        type === "brand"
          ? item.brand
          : type === "category" && typeof item.category === "string"
            ? item.category
            : type === "subcategory"
              ? item.subcategory
              : undefined;

      return {
        id,
        label: typeLabel ?? item.label ?? item.name ?? "Unnamed",
        categoryId:
          type === "subcategory" ? getCategoryId(item.category) : undefined,
      };
    })
    .filter((item) => Boolean(item.id));
}

async function getMasterOptions(
  path: string,
  cmp_id: string,
  type: "brand" | "category" | "subcategory",
): Promise<ProductFilterOption[]> {
  try {
    const response = await api.get<ProductMasterResponse>(path, {
      params: { cmp_id },
    });
    return mapMasterOptions(response.data, type);
  } catch (error) {
    if (isMissingOptionalPricing(error)) return [];
    throw error;
  }
}

export const productService = {
  getProducts: async ({
    page,
    limit = 20,
    cmp_id,
    search = "",
    brand = "",
    category = "",
    subcategory = "",
    signal,
  }: GetProductsParams): Promise<ProductListResponse> => {
    const response = await api.get<ProductListResponse>("/api/product", {
      params: {
        page,
        limit,
        cmp_id,
        search,
        brand,
        category,
        subcategory,
      },
      signal,
    });

    return {
      items: response.data?.items ?? [],
      page: response.data?.page ?? page,
      hasMore: Boolean(response.data?.hasMore),
      total: response.data?.total,
      limit: response.data?.limit ?? limit,
    };
  },

  getBrands: (cmp_id: string) =>
    getMasterOptions("/api/product/brands", cmp_id, "brand"),

  getCategories: (cmp_id: string) =>
    getMasterOptions("/api/product/categories", cmp_id, "category"),

  getSubcategories: (cmp_id: string) =>
    getMasterOptions("/api/product/subcategories", cmp_id, "subcategory"),

  getProductById: async (
    productId: string,
    options?: { signal?: AbortSignal },
  ): Promise<Product> => {
    const response = await api.get<ProductDetailResponse>(
      `/api/product/${productId}`,
      options,
    );
    return getProductDetail(response.data);
  },

  getPriceLevels: async (cmp_id: string): Promise<PriceLevel[]> => {
    try {
      const response = await api.get<
        PriceLevel[] | { item?: PriceLevel[]; data?: PriceLevel[] }
      >("/api/price-levels", { params: { cmp_id } });
      return Array.isArray(response.data)
        ? response.data
        : response.data?.item ?? response.data?.data ?? [];
    } catch (error) {
      if (isMissingOptionalPricing(error)) return [];
      throw error;
    }
  },

  getPartyLastSalePrice: async (
    partyId: string,
    productId: string,
  ): Promise<number | null> => {
    try {
      const response = await api.get<PricingResponse>("/api/pricing/lsp", {
        params: { partyId, productId },
      });
      return getPricingRate(response.data);
    } catch (error) {
      if (isMissingOptionalPricing(error)) return null;
      throw error;
    }
  },

  getGlobalLastSalePrice: async (
    productId: string,
  ): Promise<number | null> => {
    try {
      const response = await api.get<PricingResponse>(
        "/api/pricing/lsp/global",
        { params: { productId } },
      );
      return getPricingRate(response.data);
    } catch (error) {
      if (isMissingOptionalPricing(error)) return null;
      throw error;
    }
  },
};
