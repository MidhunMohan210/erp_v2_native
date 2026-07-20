import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  ChevronRight,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Tags,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  productQueryKeys,
  useInfiniteProductListQuery,
  usePriceLevelListQuery,
} from "@/hooks/queries/productQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { productService } from "@/services/product.service";
import type { PriceLevel, Product } from "@/types/product";
import type { SaleOrderItem } from "@/types/saleOrder";
import type { SaleTaxType } from "@/types/voucher";
import {
  createSaleOrderItem,
  getProductId,
  getProductPriceLevelRate,
} from "@/utils/saleOrder";
import {
  ProductFilterModal,
  type ProductFilters,
} from "@/components/sale-order-create/ProductFilterModal";
import { PriceLevelSelectionModal } from "@/components/sale-order-create/PriceLevelSelectionModal";
import { SaleOrderItemEditModal } from "@/components/sale-order-create/SaleOrderItemEditModal";

const PAGE_SIZE = 20;
const EMPTY_FILTERS: ProductFilters = {
  brandId: "",
  categoryId: "",
  subcategoryId: "",
};

type ProductSelectionModalProps = {
  visible: boolean;
  companyId: string;
  partyId: string;
  taxType: SaleTaxType;
  selectedPriceLevel: PriceLevel | null;
  items: SaleOrderItem[];
  onClose: () => void;
  onAddItem: (item: SaleOrderItem) => void;
  onUpdateItem: (item: SaleOrderItem) => void;
  onRemoveItem: (itemId: string) => void;
  onPriceLevelChange: (priceLevel: PriceLevel | null) => void;
};

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error ? error.message : "Unable to add product.";
}

function getProductSubtitle(product: Product): string {
  const brand =
    typeof product.brand === "string" ? product.brand : product.brand?.brand;
  const category =
    typeof product.category === "string"
      ? product.category
      : product.category?.category;
  return [brand, category, product.unit].filter(Boolean).join(" · ");
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function ProductSelectionModal({
  visible,
  companyId,
  partyId,
  taxType,
  selectedPriceLevel,
  items,
  onClose,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onPriceLevelChange,
}: ProductSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [loadingProductId, setLoadingProductId] = useState("");
  const [addError, setAddError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPriceLevelOpen, setIsPriceLevelOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState("");
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 500);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const editingItem = items.find((item) => item.id === editingItemId) ?? null;
  const orderPreview = useMemo(
    () =>
      items.reduce(
        (current, item) => ({
          quantity: current.quantity + item.billedQty,
          total: current.total + item.totalAmount,
        }),
        { quantity: 0, total: 0 },
      ),
    [items],
  );

  // A company change must not reuse product IDs from another company's masters.
  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setIsFilterOpen(false);
    setIsPriceLevelOpen(false);
    setEditingItemId("");
  }, [companyId]);

  const productsQuery = useInfiniteProductListQuery({
    cmp_id: companyId,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    brand: filters.brandId,
    category: filters.categoryId,
    subcategory: filters.subcategoryId,
    enabled: visible && Boolean(companyId) && Boolean(partyId),
  });
  const priceLevelsQuery = usePriceLevelListQuery(companyId, visible);
  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [productsQuery.data],
  );

  const handleLoadMore = () => {
    if (!productsQuery.hasNextPage || productsQuery.isFetchingNextPage) return;
    void productsQuery.fetchNextPage();
  };

  const resolveInitialRate = async (
    product: Product,
  ): Promise<{ rate: number; source: SaleOrderItem["initialPriceSource"] }> => {
    if (selectedPriceLevel) {
      return {
        rate:
          getProductPriceLevelRate(product, selectedPriceLevel._id) ?? 0,
        source: "priceLevel",
      };
    }

    const partyRate = await productService.getPartyLastSalePrice(
      partyId,
      getProductId(product),
    );
    if (partyRate != null && partyRate > 0) {
      return { rate: partyRate, source: "lsp" };
    }

    const globalRate = await productService.getGlobalLastSalePrice(
      getProductId(product),
    );
    return globalRate != null && globalRate > 0
      ? { rate: globalRate, source: "gsp" }
      : { rate: 0, source: "manual" };
  };

  const handleAdd = async (product: Product) => {
    const productId = getProductId(product);
    if (!productId || loadingProductId) return;

    const existingItem = items.find((item) => item.id === productId);
    if (existingItem) {
      onAddItem({ ...existingItem, actualQty: 1, billedQty: 1 });
      return;
    }

    try {
      setLoadingProductId(productId);
      setAddError("");
      const fullProduct = await queryClient.fetchQuery({
        queryKey: productQueryKeys.detail(productId),
        queryFn: ({ signal }) =>
          productService.getProductById(productId, { signal }),
        staleTime: 30_000,
      });
      const productDetail = { ...product, ...fullProduct };
      const pricing = await resolveInitialRate(productDetail);
      onAddItem(
        createSaleOrderItem(productDetail, {
          rate: pricing.rate,
          priceSource: pricing.source,
          priceLevelId: selectedPriceLevel?._id ?? null,
          taxType,
        }),
      );
    } catch (error) {
      setAddError(getErrorMessage(error));
    } finally {
      setLoadingProductId("");
    }
  };

  const handleDecrement = (item: SaleOrderItem) => {
    onUpdateItem({
      ...item,
      actualQty: Math.max(item.actualQty - 1, 0),
      billedQty: Math.max(item.billedQty - 1, 0),
    });
  };

  const applyPriceLevel = (priceLevel: PriceLevel | null) => {
    const hasChanged = priceLevel?._id !== selectedPriceLevel?._id;
    if (!hasChanged) return;

    if (items.length === 0) {
      onPriceLevelChange(priceLevel);
      return;
    }

    Alert.alert(
      "Re-price current items?",
      "Changing the price level recalculates every item. Missing rates become 0.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: () => onPriceLevelChange(priceLevel),
        },
      ],
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
      <View className="flex-1 justify-end bg-black/35">
        <View
          className="h-[92%] rounded-t-[28px] bg-white px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[18px] font-extrabold text-slate-900">
                Add products
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                Search products and add them to this order.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close product selector"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X color="#475569" size={19} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View className="mt-4 flex-row gap-2.5">
            <View className="flex-1 flex-row items-center rounded-2xl border border-slate-300 bg-slate-50 px-4">
              <Search color="#64748b" size={18} strokeWidth={2.2} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search products"
                placeholderTextColor="#94a3b8"
                className="ml-3 flex-1 py-3.5 text-[14px] text-slate-900"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Product filters${
                activeFilterCount ? `, ${activeFilterCount} active` : ""
              }`}
              onPress={() => setIsFilterOpen(true)}
              className={`h-[50px] w-[50px] items-center justify-center rounded-2xl border ${
                activeFilterCount
                  ? "border-teal-700 bg-teal-50"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              <SlidersHorizontal
                color={activeFilterCount ? "#0f766e" : "#64748b"}
                size={19}
                strokeWidth={2.2}
              />
              {activeFilterCount ? (
                <View className="absolute -right-1.5 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1">
                  <Text className="text-[10px] font-extrabold text-white">
                    {activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {activeFilterCount ? (
            <View className="mt-2.5 flex-row items-center justify-between rounded-xl bg-teal-50 px-3 py-2">
              <Text className="text-[11px] font-semibold text-teal-800">
                {activeFilterCount} product {activeFilterCount === 1 ? "filter" : "filters"} applied
              </Text>
              <Pressable onPress={() => setFilters(EMPTY_FILTERS)}>
                <Text className="text-[11px] font-bold text-teal-800">Clear</Text>
              </Pressable>
            </View>
          ) : null}

          <Text className="mb-2 mt-4 text-[12px] font-bold text-slate-700">
            Price level
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select price level"
            disabled={priceLevelsQuery.isLoading}
            onPress={() => setIsPriceLevelOpen(true)}
            className="flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
              {priceLevelsQuery.isLoading ? (
                <ActivityIndicator color="#0f766e" size="small" />
              ) : (
                <Tags color="#0f766e" size={18} strokeWidth={2.1} />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[11px] text-slate-500">Selected pricing</Text>
              <Text numberOfLines={1} className="mt-0.5 text-[13px] font-bold text-slate-900">
                {priceLevelsQuery.isLoading
                  ? "Loading price levels..."
                  : selectedPriceLevel?.pricelevel ||
                    selectedPriceLevel?.name ||
                    "Default pricing"}
              </Text>
            </View>
            {!priceLevelsQuery.isLoading ? (
              <>
                <Text className="mr-1 text-[11px] font-bold text-teal-700">
                  Change
                </Text>
                <ChevronRight color="#0f766e" size={17} strokeWidth={2.2} />
              </>
            ) : null}
          </Pressable>

          {priceLevelsQuery.isError ? (
            <View className="mt-3 flex-row items-center rounded-xl bg-amber-50 px-4 py-3">
              <Text className="flex-1 text-[11px] text-amber-800">
                Price levels could not be loaded. Default pricing is still available.
              </Text>
              <Pressable onPress={() => void priceLevelsQuery.refetch()}>
                <Text className="ml-3 text-[11px] font-bold text-amber-800">
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : null}

          {addError ? (
            <View className="mt-3 rounded-xl bg-rose-50 px-4 py-3">
              <Text className="text-[12px] text-rose-700">{addError}</Text>
            </View>
          ) : null}

          {items.length > 0 ? (
            <View className="mt-3 flex-row items-center rounded-2xl bg-slate-900 px-4 py-3">
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Order preview
                </Text>
                <Text className="mt-1 text-[12px] font-semibold text-white">
                  {items.length} product{items.length === 1 ? "" : "s"} · Qty {orderPreview.quantity}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] text-slate-400">Current total</Text>
                <Text className="mt-1 text-[15px] font-extrabold text-white">
                  {formatMoney(orderPreview.total)}
                </Text>
              </View>
            </View>
          ) : null}

          {productsQuery.isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#0f766e" />
              <Text className="mt-3 text-[13px] text-slate-500">
                Loading products...
              </Text>
            </View>
          ) : productsQuery.isError ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-[13px] text-rose-700">
                Unable to load products right now.
              </Text>
              <Pressable
                onPress={() => void productsQuery.refetch()}
                className="mt-3"
              >
                <Text className="text-[13px] font-bold text-rose-700">
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              className="mt-3 flex-1"
              data={products}
              keyExtractor={(item, index) =>
                getProductId(item) || `product-${index}`
              }
              keyboardShouldPersistTaps="handled"
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.4}
              renderItem={({ item }) => {
                const productId = getProductId(item);
                const orderItem = items.find(
                  (itemInOrder) => itemInOrder.id === productId,
                );
                const isLoading = loadingProductId === productId;

                return (
                  <View
                    className={`mb-2 rounded-2xl border bg-white px-4 py-3.5 ${
                      orderItem ? "border-teal-200" : "border-slate-200"
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                        <Package color="#0f766e" size={20} strokeWidth={2.1} />
                      </View>
                      <View className="ml-3 flex-1 pr-3">
                        <Text numberOfLines={1} className="text-[14px] font-bold text-slate-900">
                          {item.product_name || item.name || "Untitled Product"}
                        </Text>
                        <Text numberOfLines={1} className="mt-1 text-[12px] text-slate-500">
                          {getProductSubtitle(item) || "No product details"}
                        </Text>
                      </View>

                      {orderItem ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${orderItem.name}`}
                          onPress={() => setEditingItemId(orderItem.id)}
                          className="flex-row items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-2"
                        >
                          <Pencil color="#0f766e" size={13} strokeWidth={2.2} />
                          <Text className="ml-1 text-[11px] font-bold text-teal-700">
                            Edit
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${item.product_name || "product"}`}
                          disabled={Boolean(loadingProductId)}
                          onPress={() => void handleAdd(item)}
                          className="h-9 w-9 items-center justify-center rounded-full bg-teal-600"
                        >
                          {isLoading ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <Plus color="#ffffff" size={18} strokeWidth={2.5} />
                          )}
                        </Pressable>
                      )}
                    </View>

                    {orderItem ? (
                      <View className="mt-3 flex-row items-center border-t border-slate-100 pt-3">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Decrease ${orderItem.name} quantity`}
                          onPress={() => handleDecrement(orderItem)}
                          className="h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50"
                        >
                          <Minus color="#e11d48" size={15} strokeWidth={2.4} />
                        </Pressable>
                        <Text className="min-w-12 text-center text-[14px] font-extrabold text-slate-900">
                          {orderItem.billedQty}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Increase ${orderItem.name} quantity`}
                          onPress={() => void handleAdd(item)}
                          className="h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50"
                        >
                          <Plus color="#059669" size={15} strokeWidth={2.4} />
                        </Pressable>
                        <View className="ml-auto items-end">
                          <Text className="text-[10px] text-slate-500">Line total</Text>
                          <Text className="mt-0.5 text-[13px] font-extrabold text-slate-900">
                            {formatMoney(orderItem.totalAmount)}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="items-center px-5 py-10">
                  <Text className="text-[14px] font-bold text-slate-800">
                    {debouncedSearch || activeFilterCount
                      ? "No matching products"
                      : "No products found"}
                  </Text>
                </View>
              }
              ListFooterComponent={
                productsQuery.isFetchingNextPage ? (
                  <ActivityIndicator className="py-4" color="#0f766e" />
                ) : null
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
      </Modal>
      <ProductFilterModal
        visible={visible && isFilterOpen}
        companyId={companyId}
        appliedFilters={filters}
        onClose={() => setIsFilterOpen(false)}
        onApply={setFilters}
      />
      <PriceLevelSelectionModal
        visible={visible && isPriceLevelOpen}
        priceLevels={priceLevelsQuery.data ?? []}
        selectedPriceLevel={selectedPriceLevel}
        onClose={() => setIsPriceLevelOpen(false)}
        onSelect={applyPriceLevel}
      />
      <SaleOrderItemEditModal
        visible={visible && Boolean(editingItem)}
        item={editingItem}
        taxType={taxType}
        onClose={() => setEditingItemId("")}
        onSave={onUpdateItem}
        onRemove={(itemId) => {
          onRemoveItem(itemId);
          setEditingItemId("");
        }}
      />
    </>
  );
}
