import api from "@/services/api";
import type { OfflineProduct } from "@/offline/product/productMasterRepository";

type ProductMasterPage = {
  items?: OfflineProduct[];
  page?: number;
  hasMore?: boolean;
  total?: number;
  limit?: number;
};

export type ProductMasterDownloadProgress = {
  received: number;
  total: number;
};

const PRODUCT_MASTER_PAGE_SIZE = 500;

function isValidTotal(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Downloads every page and rejects changing totals or incomplete page sequences. */
export async function downloadProductMaster(
  companyId: string,
  onProgress?: (progress: ProductMasterDownloadProgress) => void,
): Promise<OfflineProduct[]> {
  const products: OfflineProduct[] = [];
  let page = 1;
  let total: number | null = null;
  let hasMore = true;

  while (hasMore) {
    const response = await api.get<ProductMasterPage>("/api/product/offline-master", {
      params: { cmp_id: companyId, page, limit: PRODUCT_MASTER_PAGE_SIZE },
    });
    const data = response.data;
    if (
      data?.page !== page ||
      !Array.isArray(data.items) ||
      typeof data.hasMore !== "boolean" ||
      !isValidTotal(data.total)
    ) {
      throw new Error("The Product master download returned an invalid page.");
    }
    if (total !== null && data.total !== total) {
      throw new Error("The Product master total changed during download.");
    }

    total = data.total;
    if (products.length + data.items.length > total) {
      throw new Error("The Product master download contains too many records.");
    }
    if (data.hasMore && data.items.length === 0) {
      throw new Error("The Product master download ended before all pages arrived.");
    }

    products.push(...data.items);
    onProgress?.({ received: products.length, total });
    if (products.length === total && data.hasMore) {
      throw new Error("The Product master pagination is inconsistent.");
    }

    hasMore = data.hasMore;
    page += 1;
  }

  if (total === null || products.length !== total) {
    throw new Error("The Product master download is incomplete.");
  }
  return products;
}
