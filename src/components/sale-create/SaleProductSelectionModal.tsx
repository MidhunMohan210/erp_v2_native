import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { Minus, Package, Pencil, Plus, Search, SlidersHorizontal, Tags, X } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductFilterModal, type ProductFilters } from "@/components/sale-order-create/ProductFilterModal";
import { PriceLevelSelectionModal } from "@/components/sale-order-create/PriceLevelSelectionModal";
import { SaleOrderItemEditModal } from "@/components/sale-order-create/SaleOrderItemEditModal";
import { productQueryKeys, useInfiniteProductListQuery, usePriceLevelListQuery } from "@/hooks/queries/productQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { productService } from "@/services/product.service";
import type { PriceLevel, Product } from "@/types/product";
import type { SaleItem } from "@/types/sale";
import type { SaleOrderPriceSource } from "@/types/saleOrder";
import type { SaleTaxType } from "@/types/voucher";
import { getProductId, getProductPriceLevelRate } from "@/utils/saleOrder";
import { calculateSaleItems, createSaleItem, getGodownSnapshot, getRemainingStock, getStockRowId, mergeSaleItem } from "@/utils/sale";

const EMPTY_FILTERS: ProductFilters = { brandId: "", categoryId: "", subcategoryId: "" };
const PAGE_SIZE = 20;

type Props = {
  visible: boolean;
  companyId: string;
  partyId: string;
  taxType: SaleTaxType;
  items: SaleItem[];
  selectedPriceLevel: PriceLevel | null;
  onClose: () => void;
  onConfirm: (items: SaleItem[], priceLevel: PriceLevel | null) => void;
};

type ResolvedPricing = {
  rate: number;
  source: SaleOrderPriceSource;
};

function formatDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

export function SaleProductSelectionModal({ visible, companyId, partyId, taxType, items, selectedPriceLevel, onClose, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [stagedItems, setStagedItems] = useState<SaleItem[]>([]);
  const [draftPriceLevel, setDraftPriceLevel] = useState<PriceLevel | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPriceLevelOpen, setIsPriceLevelOpen] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [allocationQuantities, setAllocationQuantities] = useState<Record<string, number>>({});
  // These are local edits for rows that have not reached Add to cart yet.
  const [pendingAllocationEdits, setPendingAllocationEdits] = useState<
    Record<string, SaleItem>
  >({});
  const [resolvedPricing, setResolvedPricing] =
    useState<ResolvedPricing | null>(null);
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 500);

  useEffect(() => {
    if (!visible) return;
    setStagedItems(items.map((item) => ({ ...item })));
    setDraftPriceLevel(selectedPriceLevel);
    setSelectedProduct(null);
    setAllocationQuantities({});
    setPendingAllocationEdits({});
    setResolvedPricing(null);
  }, [items, selectedPriceLevel, visible]);

  const productsQuery = useInfiniteProductListQuery({
    cmp_id: companyId, limit: PAGE_SIZE, search: debouncedSearch,
    brand: filters.brandId, category: filters.categoryId, subcategory: filters.subcategoryId,
    enabled: visible && Boolean(companyId) && Boolean(partyId),
  });
  const priceLevelsQuery = usePriceLevelListQuery(companyId, visible);
  const products = useMemo(() => productsQuery.data?.pages.flatMap((page) => page.items) ?? [], [productsQuery.data]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // A Sale must use an exact stock-row ID, but negative stock is allowed.
  const getProductStockRows = (product: Product) =>
    (product.GodownList ?? []).filter((row) => Boolean(getStockRowId(row)));

  const resolveInitialRate = async (product: Product) => {
    if (draftPriceLevel) return { rate: getProductPriceLevelRate(product, draftPriceLevel._id) ?? 0, source: "priceLevel" as const };
    const partyRate = await productService.getPartyLastSalePrice(partyId, getProductId(product));
    if (partyRate != null && partyRate > 0) return { rate: partyRate, source: "lsp" as const };
    const globalRate = await productService.getGlobalLastSalePrice(getProductId(product));
    return globalRate != null && globalRate > 0 ? { rate: globalRate, source: "gsp" as const } : { rate: 0, source: "manual" as const };
  };

  const selectProduct = async (product: Product) => {
    const productId = getProductId(product);
    if (!productId || loadingProductId || getProductStockRows(product).length === 0) return;
    try {
      setLoadingProductId(productId);
      const fullProduct = await queryClient.fetchQuery({
        queryKey: productQueryKeys.detail(productId),
        queryFn: ({ signal }) => productService.getProductById(productId, { signal }),
        staleTime: 30_000,
      });
      const productDetail = { ...product, ...fullProduct };
      if (getProductStockRows(productDetail).length > 0) {
        setSelectedProduct(productDetail);
        setAllocationQuantities({});
        setPendingAllocationEdits({});
        setResolvedPricing(await resolveInitialRate(productDetail));
      }
    } finally {
      setLoadingProductId("");
    }
  };

  const changeAllocationQuantity = (stockRowId: string, change: number) => {
    setAllocationQuantities((current) => ({
      ...current,
      [stockRowId]: Math.max(0, (current[stockRowId] ?? 0) + change),
    }));
  };

  const addAllocationsToCart = async () => {
    if (!selectedProduct) return;
    const pricing = resolvedPricing ?? (await resolveInitialRate(selectedProduct));
    let nextItems = stagedItems;

    for (const row of selectedProduct.GodownList ?? []) {
      const quantity = allocationQuantities[getStockRowId(row)] ?? 0;
      if (!getStockRowId(row) || quantity <= 0) continue;

      const item = createSaleItem(selectedProduct, row, {
        rate: pricing.rate,
        priceSource: pricing.source,
        priceLevelId: draftPriceLevel?._id ?? null,
        taxType,
      });
      const pendingEdit = pendingAllocationEdits[getStockRowId(row)];
      const configuredItem = {
        ...item,
        ...pendingEdit,
        actualQty: quantity,
        billedQty: quantity,
        alternateActualQty:
          item.alternateActualQty == null ? null : item.alternateActualQty * quantity,
        alternateBilledQty:
          item.alternateBilledQty == null ? null : item.alternateBilledQty * quantity,
      };
      nextItems = mergeSaleItem(nextItems, configuredItem, taxType);
    }

    setStagedItems(calculateSaleItems(nextItems, taxType).items);
    setSelectedProduct(null);
    setAllocationQuantities({});
    setPendingAllocationEdits({});
    setSearch("");
  };

  const openAllocationEditor = async (row: NonNullable<Product["GodownList"]>[number]) => {
    if (!selectedProduct) return;
    const stockRowId = getStockRowId(row);
    const quantity = allocationQuantities[stockRowId] ?? 0;
    const savedEdit = pendingAllocationEdits[stockRowId];
    const pricing = resolvedPricing ?? (await resolveInitialRate(selectedProduct));
    const item =
      savedEdit ??
      createSaleItem(selectedProduct, row, {
        rate: pricing.rate,
        priceSource: pricing.source,
        priceLevelId: draftPriceLevel?._id ?? null,
        taxType,
      });
    setEditingItem({
      ...item,
      actualQty: quantity,
      billedQty: quantity,
      alternateActualQty:
        item.alternateActualQty == null ? null : item.alternateActualQty * quantity,
      alternateBilledQty:
        item.alternateBilledQty == null ? null : item.alternateBilledQty * quantity,
    });
  };

  const saveEditedAllocation = (item: SaleItem) => {
    // This editor is for a pending allocation. Keep the edit local until the
    // user explicitly presses Add to cart for this product.
    setPendingAllocationEdits((current) => ({
      ...current,
      [item.godownStockRowId]: item,
    }));
    setAllocationQuantities((current) => ({
      ...current,
      [item.godownStockRowId]: item.actualQty,
    }));
    setEditingItem(null);
  };

  const discardPendingAllocationEdit = (item: SaleItem) => {
    setPendingAllocationEdits((current) => {
      const nextEdits = { ...current };
      delete nextEdits[item.godownStockRowId];
      return nextEdits;
    });
    setEditingItem(null);
  };

  return <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <View className="h-[92%] rounded-t-[28px] bg-white px-5 pt-5" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3"><Text className="text-[18px] font-extrabold text-slate-900">Add sale products</Text><Text className="mt-1 text-[12px] text-slate-500">Choose a product, then its exact stock allocation.</Text></View>
            <Pressable onPress={() => onConfirm(stagedItems, draftPriceLevel)} className="rounded-xl bg-[#134074] px-3 py-2"><Text className="text-[12px] font-bold text-white">Continue</Text></Pressable>
            <Pressable onPress={onClose} className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-slate-100"><X color="#475569" size={19} /></Pressable>
          </View>
          <View className="mt-4 flex-row gap-2"><View className="flex-1 flex-row items-center rounded-2xl border border-slate-300 bg-slate-50 px-4"><Search color="#64748b" size={18}/><TextInput value={search} onChangeText={setSearch} placeholder="Search products" className="ml-3 flex-1 py-3.5 text-[14px]" /></View><Pressable onPress={() => setIsFilterOpen(true)} className="h-[50px] w-[50px] items-center justify-center rounded-2xl border border-slate-300"><SlidersHorizontal color="#134074" size={19}/>{activeFilterCount ? <Text className="absolute right-1 top-0 text-[10px] font-bold text-[#134074]">{activeFilterCount}</Text> : null}</Pressable></View>
          <Pressable onPress={() => setIsPriceLevelOpen(true)} className="mt-3 flex-row items-center rounded-xl bg-[#EAF2F8] px-4 py-3"><Tags color="#134074" size={17}/><Text className="ml-2 flex-1 text-[12px] font-bold text-[#134074]">{draftPriceLevel?.pricelevel || draftPriceLevel?.name || "Default pricing"}</Text><Text className="text-[11px] text-[#134074]">Change</Text></Pressable>
          {productsQuery.isLoading ? <View className="flex-1 items-center justify-center"><ActivityIndicator color="#134074"/></View> : <FlatList className="mt-3 flex-1" data={products} keyExtractor={(item, index) => getProductId(item) || String(index)} onEndReached={() => productsQuery.hasNextPage && !productsQuery.isFetchingNextPage && void productsQuery.fetchNextPage()} renderItem={({item}) => { const hasStockRows = getProductStockRows(item).length > 0; const loading = loadingProductId === getProductId(item); return <Pressable disabled={!hasStockRows || loading} onPress={() => void selectProduct(item)} className={`mb-2 flex-row items-center rounded-2xl border px-4 py-3.5 ${hasStockRows ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}><Package color="#134074" size={20}/><View className="ml-3 flex-1"><Text className="text-[14px] font-bold text-slate-900">{item.product_name || item.name || "Untitled product"}</Text><Text className="mt-1 text-[11px] text-slate-500">{hasStockRows ? "Select stock allocation" : "No stock allocation rows"}</Text></View>{loading ? <ActivityIndicator color="#134074"/> : null}</Pressable>; }} ListEmptyComponent={<Text className="py-10 text-center text-slate-500">No saleable products found.</Text>} ListFooterComponent={productsQuery.isFetchingNextPage ? <ActivityIndicator color="#134074"/> : null}/>} 
        </View>
      </View>
    </Modal>
    <ProductFilterModal visible={visible && isFilterOpen} companyId={companyId} appliedFilters={filters} onClose={() => setIsFilterOpen(false)} onApply={setFilters}/>
    <PriceLevelSelectionModal visible={visible && isPriceLevelOpen} priceLevels={priceLevelsQuery.data ?? []} selectedPriceLevel={draftPriceLevel} onClose={() => setIsPriceLevelOpen(false)} onSelect={(level) => { setDraftPriceLevel(level); setIsPriceLevelOpen(false); }}/>
    <Modal visible={Boolean(selectedProduct)} transparent animationType="slide" onRequestClose={() => setSelectedProduct(null)}><View className="flex-1 justify-end bg-black/35"><View className="h-[82%] rounded-t-[28px] bg-white px-5 pt-5" style={{paddingBottom: insets.bottom + 12}}><View className="flex-row justify-between"><View className="flex-1 pr-3"><Text className="text-[18px] font-extrabold">Choose stock allocation</Text><Text className="mt-1 text-[12px] text-slate-500">Add quantities by godown and batch, then add them together.</Text></View><Pressable onPress={() => setSelectedProduct(null)}><X color="#475569" size={20}/></Pressable></View><FlatList className="mt-4 flex-1" data={selectedProduct?.GodownList ?? []} keyExtractor={(row, index) => getStockRowId(row) || String(index)} renderItem={({item}) => { const rowId = getStockRowId(item); const quantity = allocationQuantities[rowId] ?? 0; const remaining = getRemainingStock(item, stagedItems); const godown = getGodownSnapshot(item); const pendingEdit = pendingAllocationEdits[rowId]; const baseItem = pendingEdit ?? createSaleItem(selectedProduct as Product, item, { rate: resolvedPricing?.rate ?? 0, priceSource: resolvedPricing?.source ?? "manual", priceLevelId: draftPriceLevel?._id ?? null, taxType }); const previewItem = calculateSaleItems([{ ...baseItem, actualQty: quantity, billedQty: quantity, alternateActualQty: baseItem.alternateActualQty == null ? null : baseItem.alternateActualQty * quantity, alternateBilledQty: baseItem.alternateBilledQty == null ? null : baseItem.alternateBilledQty * quantity }], taxType).items[0]; return <View className="mb-3 rounded-[22px] border border-slate-200 bg-white p-4"><View className="flex-row items-start"><View className="flex-1 pr-3"><Text className="text-[14px] font-extrabold text-slate-900">{godown.name || "Godown name unavailable"}</Text>{item.batch ? <Text className="mt-1 text-[12px] text-slate-600">Batch {item.batch}</Text> : null}<Text className={`mt-2 text-[12px] font-bold ${remaining < 0 ? "text-rose-600" : "text-[#134074]"}`}>Available {remaining}</Text><Text className="mt-1 text-[11px] text-slate-500">Rate {previewItem.rate.toFixed(2)}</Text>{item.mfgdt || item.expdt ? <Text className="mt-1 text-[11px] text-slate-500">{item.mfgdt ? `Mfg ${formatDate(item.mfgdt)}` : ""}{item.mfgdt && item.expdt ? " · " : ""}{item.expdt ? `Exp ${formatDate(item.expdt)}` : ""}</Text> : null}</View><Pressable onPress={() => void openAllocationEditor(item)} className="flex-row items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-2"><Pencil color="#0284c7" size={14}/><Text className="ml-1 text-[12px] font-bold text-sky-700">Edit</Text></Pressable></View><View className="mt-4 flex-row items-center border-t border-slate-100 pt-3"><Pressable onPress={() => changeAllocationQuantity(rowId, -1)} className="h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50"><Minus color="#e11d48" size={18}/></Pressable><Text className="min-w-14 text-center text-[18px] font-extrabold text-slate-900">{quantity}</Text><Pressable onPress={() => changeAllocationQuantity(rowId, 1)} className="h-10 w-10 items-center justify-center rounded-xl border border-[#A9C4D8] bg-[#EAF2F8]"><Plus color="#134074" size={18}/></Pressable><View className="ml-auto items-end"><Text className="text-[10px] text-slate-500">Total</Text><Text className="mt-0.5 text-[14px] font-extrabold text-slate-900">{previewItem.totalAmount.toFixed(2)}</Text></View></View></View>; }}/><Pressable disabled={!Object.values(allocationQuantities).some((quantity) => quantity > 0)} onPress={() => void addAllocationsToCart()} className={`mt-3 rounded-2xl py-4 ${Object.values(allocationQuantities).some((quantity) => quantity > 0) ? "bg-[#134074]" : "bg-slate-300"}`}><Text className="text-center text-[14px] font-extrabold text-white">Add to cart</Text></Pressable></View></View></Modal>
    <SaleOrderItemEditModal visible={Boolean(editingItem)} item={editingItem} taxType={taxType} onClose={() => setEditingItem(null)} onRemove={() => editingItem && discardPendingAllocationEdit(editingItem)} onSave={(item) => saveEditedAllocation(item as SaleItem)}/>
  </>;
}
