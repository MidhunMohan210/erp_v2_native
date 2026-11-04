import api from "@/services/api";
import type {
  FilterType,
  OfflineProductFilter,
} from "@/offline/productFilter/productFilterMasterRepository";

type ProductFilterApiItem = {
  _id?: unknown;
  brand?: unknown;
  category?: unknown;
  subcategory?: unknown;
};

function getEndpoint(filterType: FilterType): string {
  if (filterType === "brand") return "/api/product/brands";
  if (filterType === "category") return "/api/product/categories";
  return "/api/product/subcategories";
}

function getName(item: ProductFilterApiItem, filterType: FilterType): unknown {
  if (filterType === "brand") return item.brand;
  if (filterType === "category") return item.category;
  return item.subcategory;
}

/** The three existing APIs return all master rows in their items array. */
export async function downloadProductFilters(
  companyId: string,
  filterType: FilterType,
): Promise<OfflineProductFilter[]> {
  const response = await api.get<{ items?: ProductFilterApiItem[] }>(
    getEndpoint(filterType),
    { params: { cmp_id: companyId } },
  );

  if (!Array.isArray(response.data?.items)) {
    throw new Error("The Product Filter download returned an invalid response.");
  }

  return response.data.items.map((item) => ({
    _id: item._id as string,
    name: getName(item, filterType) as string,
    filterType,
    categoryId: filterType === "subcategory" ? (item.category as string) : null,
  }));
}
