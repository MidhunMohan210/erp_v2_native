import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  calculateSaleOrderItems,
  createSaleOrderItem,
  getProductId,
  getProductPriceLevelRate,
} from "@/utils/saleOrder";
import {
  ProductFilterModal,
  type ProductFilters,
} from "@/components/sale-order-create/ProductFilterModal";
import { PriceLevelSelectionModal } from "@/components/sale-order-create/PriceLevelSelectionModal";
import { RepriceConfirmationSheet } from "@/components/sale-order-create/RepriceConfirmationSheet";
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
  onConfirm: (items: SaleOrderItem[], priceLevel: PriceLevel | null) => void;
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
  return [brand, category, product.base_unit || product.unit]
    .filter(Boolean)
    .join(" · ");
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function ProductSelectionModal({
  visible,
  companyId,
  partyId, //used to find the party’s previous sale price
  taxType, //used while recalculating item tax and totals
  selectedPriceLevel, //currently selected price level
  items, //products already added to the sale order
  onClose,
  onConfirm,
}: ProductSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [loadingProductId, setLoadingProductId] = useState("");
  const [addError, setAddError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPriceLevelOpen, setIsPriceLevelOpen] = useState(false);
  const [isRepriceConfirmationOpen, setIsRepriceConfirmationOpen] =
    useState(false);
  const [pendingPriceLevel, setPendingPriceLevel] =
    useState<PriceLevel | null>(null);
  const [editingItemId, setEditingItemId] = useState("");
  const [stagedItems, setStagedItems] = useState<SaleOrderItem[]>([]); //stagedItems is a temporary copy of the sale-order items.The modal does not directly modify items in redux
  const [draftPriceLevel, setDraftPriceLevel] = useState<PriceLevel | null>(
    null,
  );
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 500);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const editingItem =
    stagedItems.find((item) => item.id === editingItemId) ?? null;
  const orderPreview = useMemo(
    () =>
      stagedItems.reduce(
        (current, item) => ({
          quantity: current.quantity + item.billedQty,
          total: current.total + item.totalAmount,
        }),
        { quantity: 0, total: 0 },
      ),
    [stagedItems],
  );

  useEffect(() => {
    if (!visible) return;

    // It copies the existing order items into local state.
    //     Redux items:
    // [
    //   { id: "p1", billedQty: 2 }
    // ]
    // stagedItems:
    // [
    //   { id: "p1", billedQty: 2 }
    // ]
    setStagedItems(items.map((item) => ({ ...item })));
    setDraftPriceLevel(selectedPriceLevel);
    setEditingItemId("");
  }, [items, selectedPriceLevel, visible]);

  // A company change must not reuse product IDs from another company's masters.
  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setIsFilterOpen(false);
    setIsPriceLevelOpen(false);
    setIsRepriceConfirmationOpen(false);
    setPendingPriceLevel(null);
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

  // Combines products from all fetched pages into one array; useMemo avoids rebuilding it unless query data changes. item data comes inside pages, which is an array of pages. Each page has an items array. So we flatten the pages into one array of items.
  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [productsQuery.data],
  );

  const handleLoadMore = () => {
    if (!productsQuery.hasNextPage || productsQuery.isFetchingNextPage) return;
    void productsQuery.fetchNextPage();
  };

  //   1. Selected price level
  // 2. Party last-sale price
  // 3. Global last-sale price
  // 4. Manual price, starting at 0
  const resolveInitialRate = async (
    product: Product,
  ): Promise<{ rate: number; source: SaleOrderItem["initialPriceSource"] }> => {
    //When a price level is selected, only that price level is checked.
    if (draftPriceLevel) {
      return {
        rate: getProductPriceLevelRate(product, draftPriceLevel._id) ?? 0,
        source: "priceLevel",
      };
    }
    //Priority 2: Party last-sale price
    const partyRate = await productService.getPartyLastSalePrice(
      partyId,
      getProductId(product),
    );
    if (partyRate != null && partyRate > 0) {
      return { rate: partyRate, source: "lsp" };
    }

    //Priority 3: Global last-sale price
    // Priority 4: Manual
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

    const existingItem = stagedItems.find((item) => item.id === productId);
    if (existingItem) {
      setStagedItems(
        (current) =>
          calculateSaleOrderItems(
            current.map((item) =>
              item.id === productId
                ? {
                    ...item,

                    ///increases its quantity:
                    actualQty: item.actualQty + 1,
                    billedQty: item.billedQty + 1,
                  }
                : item,
            ),
            taxType,
          ).items,
      );
      return;
    }

    try {
      setLoadingProductId(productId);
      setAddError("");
      const fullProduct = await queryClient.fetchQuery({
        queryKey: productQueryKeys.detail(productId),
        queryFn: ({ signal }) =>
          // React Query provides signal so the API request can be cancelled when no longer needed.

          productService.getProductById(productId, { signal }),
        staleTime: 30_000,
      });
      const productDetail = { ...product, ...fullProduct };
      const pricing = await resolveInitialRate(productDetail);
      const newItem = createSaleOrderItem(productDetail, {
        rate: pricing.rate,
        priceSource: pricing.source,
        priceLevelId: draftPriceLevel?._id ?? null,
        taxType,
      });
      setStagedItems((current) => [...current, newItem]);
    } catch (error) {
      setAddError(getErrorMessage(error));
    } finally {
      setLoadingProductId("");
    }
  };

  const handleDecrement = (item: SaleOrderItem) => {
    const nextItem = {
      ...item,
      actualQty: Math.max(item.actualQty - 1, 0),
      billedQty: Math.max(item.billedQty - 1, 0),
    };
    setStagedItems(
      (current) =>
        calculateSaleOrderItems(
          nextItem.actualQty <= 0 && nextItem.billedQty <= 0
            ? current.filter((currentItem) => currentItem.id !== item.id)
            : //Otherwise, the item is updated.
              current.map((currentItem) =>
                currentItem.id === item.id ? nextItem : currentItem,
              ),
          taxType,
        ).items,
    );
  };

  const updatePriceLevel = (priceLevel: PriceLevel | null) => {
    // Use the selected price level ID. Default pricing has no ID.
    const priceLevelId = priceLevel?._id ?? "";

    // Keep the new price level local until the user presses Continue.
    setDraftPriceLevel(priceLevel);

    setStagedItems(
      (current) =>
        calculateSaleOrderItems(
          current.map((item) =>
            priceLevelId
              ? {
                  ...item,
                  priceLevelId,
                  // A missing product rate becomes 0 for the new price level.
                  rate: getProductPriceLevelRate(item, priceLevelId) ?? 0,
                  initialPriceSource: "priceLevel",
                }
              : {
                  ...item,
                  priceLevelId: null,
                  // A removed price level must not leave its old rate behind.
                  rate:
                    item.initialPriceSource === "priceLevel" ? 0 : item.rate,
                },
          ),
          taxType,
        ).items,
    );
  };

  const applyPriceLevel = (priceLevel: PriceLevel | null) => {
    const hasChanged = priceLevel?._id !== draftPriceLevel?._id;
    if (!hasChanged) return;

    // When there are no products in the order,
    // the price level can be changed immediately.
    if (stagedItems.length === 0) {
      updatePriceLevel(priceLevel);
      return;
    }

    // Keep the requested level pending until the user confirms re-pricing.
    setPendingPriceLevel(priceLevel);
    setIsRepriceConfirmationOpen(true);
  };

  const cancelRepricing = () => {
    setIsRepriceConfirmationOpen(false);
    setPendingPriceLevel(null);
  };

  const confirmRepricing = () => {
    updatePriceLevel(pendingPriceLevel);
    setIsRepriceConfirmationOpen(false);
    setPendingPriceLevel(null);
  };

  //This allows changes such as:
  // rate
  // quantity
  // discount
  // tax-related details
  // other editable item fields

  const handleSaveEditedItem = (updatedItem: SaleOrderItem) => {
    setStagedItems(
      (current) =>
        calculateSaleOrderItems(
          current.map((item) =>
            item.id === updatedItem.id ? updatedItem : item,
          ),
          taxType,
        ).items,
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setStagedItems(
      (current) =>
        calculateSaleOrderItems(
          current.filter((item) => item.id !== itemId),
          taxType,
        ).items,
    );
    setEditingItemId("");
  };

  const handleContinue = () => {
    onConfirm(stagedItems, draftPriceLevel);
    onClose();
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
              <View className="flex-row items-center gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm selected products"
                  accessibilityState={{ disabled: Boolean(loadingProductId) }}
                  disabled={Boolean(loadingProductId)}
                  onPress={handleContinue}
                  className={`rounded-xl px-3.5 py-2.5 ${
                    loadingProductId ? "bg-slate-300" : "bg-[#004178]"
                  }`}
                >
                  <Text className="text-[12px] font-extrabold text-white">
                    {loadingProductId ? "Adding..." : "Continue"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close and discard product changes"
                  onPress={onClose}
                  className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                >
                  <X color="#475569" size={19} strokeWidth={2.2} />
                </Pressable>
              </View>
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
                    ? "border-[#004178] bg-[#EAF2F8]"
                    : "border-slate-300 bg-slate-50"
                }`}
              >
                <SlidersHorizontal
                  color={activeFilterCount ? "#004178" : "#64748b"}
                  size={19}
                  strokeWidth={2.2}
                />
                {activeFilterCount ? (
                  <View className="absolute -right-1.5 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-[#004178] px-1">
                    <Text className="text-[10px] font-extrabold text-white">
                      {activeFilterCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {activeFilterCount ? (
              <View className="mt-2.5 flex-row items-center justify-between rounded-xl bg-[#EAF2F8] px-3 py-2">
                <Text className="text-[11px] font-semibold text-[#004178]">
                  {activeFilterCount} product{" "}
                  {activeFilterCount === 1 ? "filter" : "filters"} applied
                </Text>
                <Pressable onPress={() => setFilters(EMPTY_FILTERS)}>
                  <Text className="text-[11px] font-bold text-[#004178]">
                    Clear
                  </Text>
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
                  <ActivityIndicator color="#004178" size="small" />
                ) : (
                  <Tags color="#004178" size={18} strokeWidth={2.1} />
                )}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[11px] text-slate-500">
                  Selected pricing
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-0.5 text-[13px] font-bold text-slate-900"
                >
                  {priceLevelsQuery.isLoading
                    ? "Loading price levels..."
                    : draftPriceLevel?.pricelevel ||
                      draftPriceLevel?.name ||
                      "Default pricing"}
                </Text>
              </View>
              {!priceLevelsQuery.isLoading ? (
                <>
                  <Text className="mr-1 text-[11px] font-bold text-[#004178]">
                    Change
                  </Text>
                  <ChevronRight color="#004178" size={17} strokeWidth={2.2} />
                </>
              ) : null}
            </Pressable>

            {priceLevelsQuery.isError ? (
              <View className="mt-3 flex-row items-center rounded-xl bg-amber-50 px-4 py-3">
                <Text className="flex-1 text-[11px] text-amber-800">
                  Price levels could not be loaded. Default pricing is still
                  available.
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

            {stagedItems.length > 0 ? (
              <View className="mt-3 flex-row items-center rounded-xl bg-[#3f5c76] px-4 py-3">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Order preview
                  </Text>
                  <Text className="mt-1 text-[12px] font-semibold text-white">
                    {stagedItems.length} product
                    {stagedItems.length === 1 ? "" : "s"} · Qty{" "}
                    {orderPreview.quantity}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] text-slate-400">
                    Current total
                  </Text>
                  <Text className="mt-1 text-[15px] font-extrabold text-white">
                    {formatMoney(orderPreview.total)}
                  </Text>
                </View>
              </View>
            ) : null}

            {productsQuery.isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#004178" />
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
                  const orderItem = stagedItems.find(
                    (itemInOrder) => itemInOrder.id === productId,
                  );
                  const isLoading = loadingProductId === productId;

                  return (
                    <View
                      className={`mb-2 rounded-2xl border bg-white px-4 py-3.5 ${
                        orderItem ? "border-rose-200" : "border-slate-200"
                      }`}
                    >
                      <View className="flex-row items-center">
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                          <Package
                            color="#db2777"
                            size={20}
                            strokeWidth={2.1}
                          />
                        </View>
                        <View className="ml-3 flex-1 pr-3">
                          <Text
                            numberOfLines={1}
                            className="text-[14px] font-bold text-slate-900"
                          >
                            {item.product_name ||
                              item.name ||
                              "Untitled Product"}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="mt-1 text-[12px] text-slate-500"
                          >
                            {getProductSubtitle(item) || "No product details"}
                          </Text>
                        </View>

                        {orderItem ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${orderItem.name}`}
                            onPress={() => setEditingItemId(orderItem.id)}
                            className="flex-row items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-2"
                          >
                            <Pencil
                              color="#0284c7"
                              size={13}
                              strokeWidth={2.2}
                            />
                            <Text className="ml-1 text-[11px] font-bold text-sky-700">
                              Edit
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Add ${item.product_name || "product"}`}
                            disabled={Boolean(loadingProductId)}
                            onPress={() => void handleAdd(item)}
                            className="h-9 w-9 items-center justify-center rounded-full bg-[#004178]"
                          >
                            {isLoading ? (
                              <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                              <Plus
                                color="#ffffff"
                                size={18}
                                strokeWidth={2.5}
                              />
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
                            <Minus
                              color="#e11d48"
                              size={15}
                              strokeWidth={2.4}
                            />
                          </Pressable>
                          <Text className="min-w-12 text-center text-[14px] font-extrabold text-slate-900">
                            {orderItem.billedQty}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Increase ${orderItem.name} quantity`}
                            onPress={() => void handleAdd(item)}
                            className="h-8 w-8 items-center justify-center rounded-lg border border-[#A9C4D8] bg-[#EAF2F8]"
                          >
                            <Plus color="#004178" size={15} strokeWidth={2.4} />
                          </Pressable>
                          <View className="ml-auto items-end">
                            <Text className="text-[10px] text-slate-500">
                              Line total
                            </Text>
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
                    <ActivityIndicator className="py-4" color="#004178" />
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
        selectedPriceLevel={draftPriceLevel}
        onClose={() => setIsPriceLevelOpen(false)}
        onSelect={applyPriceLevel}
      />
      <RepriceConfirmationSheet
        visible={visible && isRepriceConfirmationOpen}
        onCancel={cancelRepricing}
        onConfirm={confirmRepricing}
      />
      <SaleOrderItemEditModal
        visible={visible && Boolean(editingItem)}
        item={editingItem}
        taxType={taxType}
        onClose={() => setEditingItemId("")}
        onSave={handleSaveEditedItem}
        onRemove={handleRemoveItem}
      />
    </>
  );
}
