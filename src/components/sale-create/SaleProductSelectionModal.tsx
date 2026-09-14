import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { Check, Minus, Package, Pencil, Plus, Search, SlidersHorizontal, Tags, X } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { ProductFilterModal, type ProductFilters } from "@/components/sale-order-create/ProductFilterModal";
import { PriceLevelSelectionModal } from "@/components/sale-order-create/PriceLevelSelectionModal";
import { SaleOrderItemEditModal } from "@/components/sale-order-create/SaleOrderItemEditModal";
import { SaleAllItemsModal } from "@/components/sale-create/SaleItemsSection";
import { productQueryKeys, useInfiniteProductListQuery, usePriceLevelListQuery } from "@/hooks/queries/productQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { productService } from "@/services/product.service";
import type { PriceLevel, Product, ProductGodownStockRow } from "@/types/product";
import type { SaleItem } from "@/types/sale";
import type { SaleOrderPriceSource } from "@/types/saleOrder";
import type { SaleTaxType } from "@/types/voucher";
import { getProductId, getProductPriceLevelRate } from "@/utils/saleOrder";
import { calculateSaleItems, createSaleItem, getGodownSnapshot, getRemainingStock, getStockRowId, mergeSaleItem } from "@/utils/sale";

const EMPTY_FILTERS: ProductFilters = { brandId: "", categoryId: "", subcategoryId: "" };
const PAGE_SIZE = 20;
const MINIMUM_CART_LOADING_MS = 1000;

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

type PriceLevelChangeConfirmationProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

type CartAdditionState = "idle" | "adding" | "success";

function getAlternateQuantity(
  quantity: number,
  baseDenominator: number | null,
  altConversion: number | null,
): number | null {
  if (!baseDenominator || !altConversion) return null;
  return (quantity * altConversion) / baseDenominator;
}

function applyAllocationQuantities(
  item: SaleItem,
  actualQty: number,
  billedQty: number,
): SaleItem {
  // Stock and billing are independent. Derive each alternate-unit snapshot
  // from its matching base quantity so a manual billed quantity is retained.
  return {
    ...item,
    actualQty,
    billedQty,
    alternateActualQty: getAlternateQuantity(
      actualQty,
      item.baseDenominator,
      item.altConversion,
    ),
    alternateBilledQty: getAlternateQuantity(
      billedQty,
      item.baseDenominator,
      item.altConversion,
    ),
  };
}

function formatDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function PriceLevelChangeConfirmation({
  visible,
  onCancel,
  onConfirm,
}: PriceLevelChangeConfirmationProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-[28px] bg-white px-6 py-6">
          <Text className="text-[18px] font-extrabold text-slate-900">
            Change price level?
          </Text>
          <Text className="mt-3 text-[14px] leading-5 text-slate-600">
            Changing the price level will reset all products that are currently selected but not yet added to the cart. Products already in the cart will not be affected.
          </Text>
          <View className="mt-6 flex-row gap-3">
            <Pressable onPress={onCancel} className="flex-1 items-center rounded-xl border border-slate-300 py-3.5">
              <Text className="text-[13px] font-bold text-slate-700">Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} className="flex-1 items-center rounded-xl bg-[#134074] py-3.5">
              <Text className="text-center text-[13px] font-bold text-white">Change Price Level</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AddToCartButtonContent({ state }: { state: CartAdditionState }) {
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state !== "success") {
      checkScale.setValue(0);
      checkOpacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [checkOpacity, checkScale, state]);

  if (state === "idle") return <Text className="text-center text-[13px] font-extrabold text-white">Add to Cart</Text>;
  if (state === "adding") return <ActivityIndicator color="#ffffff" size="small" />;

  return <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkScale }] }} className="h-7 w-7 items-center justify-center rounded-full bg-white/20"><Check color="#ffffff" size={18} strokeWidth={3} /></Animated.View>;
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
  const [isPriceLevelChangeConfirmationOpen, setIsPriceLevelChangeConfirmationOpen] = useState(false);
  const [pendingPriceLevel, setPendingPriceLevel] = useState<PriceLevel | null>(null);
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
  const [editingStagedItem, setEditingStagedItem] = useState<SaleItem | null>(null);
  const [pendingSingleGodownItems, setPendingSingleGodownItems] = useState<Record<string, SaleItem>>({});
  const [editingSingleGodownStockRowId, setEditingSingleGodownStockRowId] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mainCartAdditionState, setMainCartAdditionState] = useState<CartAdditionState>("idle");
  const [godownCartAdditionState, setGodownCartAdditionState] = useState<CartAdditionState>("idle");
  const isAddingMainCartRef = useRef(false);
  const isAddingGodownCartRef = useRef(false);
  const mainCartAdditionStartedAtRef = useRef(0);
  const godownCartAdditionStartedAtRef = useRef(0);
  const mainCartSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const godownCartSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 500);

  useEffect(() => {
    if (!visible) return;
    setStagedItems(items.map((item) => ({ ...item })));
    setDraftPriceLevel(selectedPriceLevel);
    setSelectedProduct(null);
    setAllocationQuantities({});
    setPendingAllocationEdits({});
    setResolvedPricing(null);
    setEditingItem(null);
    setEditingStagedItem(null);
    setPendingSingleGodownItems({});
    setEditingSingleGodownStockRowId("");
    setIsCartOpen(false);
    setMainCartAdditionState("idle");
    setGodownCartAdditionState("idle");
    isAddingMainCartRef.current = false;
    isAddingGodownCartRef.current = false;
    if (mainCartSuccessTimeoutRef.current) clearTimeout(mainCartSuccessTimeoutRef.current);
    if (godownCartSuccessTimeoutRef.current) clearTimeout(godownCartSuccessTimeoutRef.current);
    setIsPriceLevelChangeConfirmationOpen(false);
    setPendingPriceLevel(null);
  }, [items, selectedPriceLevel, visible]);

  useEffect(() => () => {
    if (mainCartSuccessTimeoutRef.current) clearTimeout(mainCartSuccessTimeoutRef.current);
    if (godownCartSuccessTimeoutRef.current) clearTimeout(godownCartSuccessTimeoutRef.current);
  }, []);

  const productsQuery = useInfiniteProductListQuery({
    cmp_id: companyId, limit: PAGE_SIZE, search: debouncedSearch,
    brand: filters.brandId, category: filters.categoryId, subcategory: filters.subcategoryId,
    forSale: true,
    enabled: visible && Boolean(companyId) && Boolean(partyId),
  });
  const priceLevelsQuery = usePriceLevelListQuery(companyId, visible);
  const products = useMemo(() => productsQuery.data?.pages.flatMap((page) => page.items) ?? [], [productsQuery.data]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // A Sale must use an exact stock-row ID, but negative stock is allowed.
  const getProductStockRows = (product: Product) =>
    (product.GodownList ?? []).filter((row) => Boolean(getStockRowId(row)));

  const hasStagedSelections =
    Object.values(pendingSingleGodownItems).some((item) => item.actualQty > 0) ||
    Object.values(allocationQuantities).some((quantity) => quantity > 0);

  const resetStagedSelections = () => {
    // Price level applies only to future selections. Never modify cart lines.
    setPendingSingleGodownItems({});
    setSelectedProduct(null);
    setAllocationQuantities({});
    setPendingAllocationEdits({});
    setResolvedPricing(null);
    setEditingSingleGodownStockRowId("");
    setEditingItem(null);
  };

  const applyNewPriceLevel = (priceLevel: PriceLevel | null) => {
    setDraftPriceLevel(priceLevel);
    setPendingPriceLevel(null);
    setIsPriceLevelChangeConfirmationOpen(false);
  };

  const requestPriceLevelChange = (priceLevel: PriceLevel | null) => {
    const hasChanged = priceLevel?._id !== draftPriceLevel?._id;
    if (!hasChanged) return;

    if (!hasStagedSelections) {
      applyNewPriceLevel(priceLevel);
      return;
    }

    setPendingPriceLevel(priceLevel);
    setIsPriceLevelChangeConfirmationOpen(true);
  };

  const cancelPriceLevelChange = () => {
    setPendingPriceLevel(null);
    setIsPriceLevelChangeConfirmationOpen(false);
  };

  const confirmPriceLevelChange = () => {
    resetStagedSelections();
    applyNewPriceLevel(pendingPriceLevel);
  };

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
        queryKey: productQueryKeys.detail(productId, companyId),
        queryFn: ({ signal }) =>
          productService.getProductById(productId, { signal, cmp_id: companyId }),
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

  const getSingleGodown = (product: Product): ProductGodownStockRow | null => {
    // Sale lines must always be linked to a real stock-row ID.
    if (product.GodownList?.length !== 1) return null;
    const godown = product.GodownList[0];
    return getStockRowId(godown) ? godown : null;
  };

  const findPendingSingleGodownItem = (
    godown: ProductGodownStockRow,
  ): SaleItem | null => {
    const stockRowId = getStockRowId(godown);
    return pendingSingleGodownItems[stockRowId] ?? null;
  };

  const createPendingSingleGodownItem = async (product: Product): Promise<SaleItem | null> => {
    const productId = getProductId(product);
    const listedGodown = getSingleGodown(product);
    if (!productId || !listedGodown || loadingProductId) return null;

    try {
      setLoadingProductId(productId);
      const fullProduct = await queryClient.fetchQuery({
        queryKey: productQueryKeys.detail(productId, companyId),
        queryFn: ({ signal }) =>
          productService.getProductById(productId, { signal, cmp_id: companyId }),
        staleTime: 30_000,
      });
      const productDetail = { ...product, ...fullProduct };
      const singleGodown = getSingleGodown(productDetail);

      // If the server now reports multiple rows, preserve the existing chooser.
      if (!singleGodown) {
        setSelectedProduct(productDetail);
        setAllocationQuantities({});
        setPendingAllocationEdits({});
        setResolvedPricing(await resolveInitialRate(productDetail));
        return null;
      }

      const pricing = await resolveInitialRate(productDetail);
      return applyAllocationQuantities(
        createSaleItem(productDetail, singleGodown, {
          rate: pricing.rate,
          priceSource: pricing.source,
          priceLevelId: draftPriceLevel?._id ?? null,
          taxType,
        }),
        1,
        1,
      );
    } finally {
      setLoadingProductId("");
    }
  };

  const changeSingleGodownQuantity = async (product: Product, change: number) => {
    const singleGodown = getSingleGodown(product);
    if (!singleGodown) return;

    const stockRowId = getStockRowId(singleGodown);
    const pendingItem = pendingSingleGodownItems[stockRowId];
    if (pendingItem) {
      const nextActualQty = Math.max(0, pendingItem.actualQty + change);
      setPendingSingleGodownItems((current) => ({
        ...current,
        [stockRowId]: applyAllocationQuantities(
          pendingItem,
          nextActualQty,
          nextActualQty,
        ),
      }));
      return;
    }

    if (change <= 0) return;
    const newItem = await createPendingSingleGodownItem(product);
    if (!newItem) return;
    setPendingSingleGodownItems((current) => ({
      ...current,
      [newItem.godownStockRowId]: newItem,
    }));
  };

  const openSingleGodownEditor = async (product: Product) => {
    const singleGodown = getSingleGodown(product);
    if (!singleGodown) return;
    const stockRowId = getStockRowId(singleGodown);
    const pendingItem = pendingSingleGodownItems[stockRowId];
    const item = pendingItem ?? await createPendingSingleGodownItem(product);
    if (!item) return;
    setEditingSingleGodownStockRowId(item.godownStockRowId);
    setEditingItem(pendingItem ?? applyAllocationQuantities(item, 0, 0));
  };

  const saveEditedSingleGodownItem = (item: SaleItem) => {
    setPendingSingleGodownItems((current) => ({
      ...current,
      [item.godownStockRowId]: item,
    }));
    setEditingSingleGodownStockRowId("");
    setEditingItem(null);
  };

  const discardEditedSingleGodownItem = () => {
    if (editingSingleGodownStockRowId) {
      setPendingSingleGodownItems((current) => {
        const nextItems = { ...current };
        delete nextItems[editingSingleGodownStockRowId];
        return nextItems;
      });
    }
    setEditingSingleGodownStockRowId("");
    setEditingItem(null);
  };

  const beginMainCartAddition = (): boolean => {
    if (isAddingMainCartRef.current || mainCartAdditionState !== "idle") return false;
    isAddingMainCartRef.current = true;
    mainCartAdditionStartedAtRef.current = Date.now();
    setMainCartAdditionState("adding");
    return true;
  };

  const showMainCartAdditionSuccess = (onComplete: () => void) => {
    const showSuccess = () => {
      isAddingMainCartRef.current = false;
      setMainCartAdditionState("success");
      mainCartSuccessTimeoutRef.current = setTimeout(() => {
        setMainCartAdditionState("idle");
        onComplete();
        mainCartSuccessTimeoutRef.current = null;
      }, 800);
    };

    if (mainCartSuccessTimeoutRef.current) clearTimeout(mainCartSuccessTimeoutRef.current);
    const remainingLoadingTime = Math.max(
      0,
      MINIMUM_CART_LOADING_MS - (Date.now() - mainCartAdditionStartedAtRef.current),
    );
    mainCartSuccessTimeoutRef.current = setTimeout(showSuccess, remainingLoadingTime);
  };

  const beginGodownCartAddition = (): boolean => {
    if (isAddingGodownCartRef.current || godownCartAdditionState !== "idle") return false;
    isAddingGodownCartRef.current = true;
    godownCartAdditionStartedAtRef.current = Date.now();
    setGodownCartAdditionState("adding");
    return true;
  };

  const showGodownCartAdditionSuccess = () => {
    const showSuccess = () => {
      isAddingGodownCartRef.current = false;
      setGodownCartAdditionState("success");
      godownCartSuccessTimeoutRef.current = setTimeout(() => {
        setGodownCartAdditionState("idle");
        setAllocationQuantities({});
        setPendingAllocationEdits({});
        setSearch("");
        setSelectedProduct(null);
        godownCartSuccessTimeoutRef.current = null;
      }, 800);
    };

    if (godownCartSuccessTimeoutRef.current) clearTimeout(godownCartSuccessTimeoutRef.current);
    const remainingLoadingTime = Math.max(
      0,
      MINIMUM_CART_LOADING_MS - (Date.now() - godownCartAdditionStartedAtRef.current),
    );
    godownCartSuccessTimeoutRef.current = setTimeout(showSuccess, remainingLoadingTime);
  };

  const handleMainCartAdditionError = (error: unknown) => {
    isAddingMainCartRef.current = false;
    setMainCartAdditionState("idle");
    toast.error(error instanceof Error ? error.message : "Unable to add products to cart.");
  };

  const handleGodownCartAdditionError = (error: unknown) => {
    isAddingGodownCartRef.current = false;
    setGodownCartAdditionState("idle");
    toast.error(error instanceof Error ? error.message : "Unable to add products to cart.");
  };

  const addSingleGodownItemsToCart = () => {
    if (!beginMainCartAddition()) return;
    const pendingItems = Object.values(pendingSingleGodownItems).filter(
      (item) => item.actualQty > 0,
    );
    if (pendingItems.length === 0) {
      isAddingMainCartRef.current = false;
      setMainCartAdditionState("idle");
      return;
    }

    try {
      let nextItems = stagedItems;
      for (const item of pendingItems) {
        // This is the same godown-specific merge used by the allocation sheet.
        nextItems = mergeSaleItem(nextItems, item, taxType);
      }
      setStagedItems(calculateSaleItems(nextItems, taxType).items);
      // Keep the selection visible until the button feedback completes.
      showMainCartAdditionSuccess(() => setPendingSingleGodownItems({}));
    } catch (error) {
      // Keep the pending selection so the user can retry after an error.
      handleMainCartAdditionError(error);
    }
  };

  const saveEditedStagedItem = (item: SaleItem) => {
    setStagedItems((current) =>
      calculateSaleItems(
        current.map((currentItem) =>
          currentItem.id === item.id ? item : currentItem,
        ),
        taxType,
      ).items,
    );
    setEditingStagedItem(null);
  };

  const removeEditedStagedItem = (item: SaleItem) => {
    setStagedItems((current) =>
      calculateSaleItems(
        current.filter((currentItem) => currentItem.id !== item.id),
        taxType,
      ).items,
    );
    setEditingStagedItem(null);
  };

  const changeAllocationQuantity = (stockRowId: string, change: number) => {
    setAllocationQuantities((current) => ({
      ...current,
      [stockRowId]: Math.max(0, (current[stockRowId] ?? 0) + change),
    }));
    setPendingAllocationEdits((current) => {
      const savedEdit = current[stockRowId];
      if (!savedEdit) return current;
      const nextActualQty = Math.max(0, savedEdit.actualQty + change);

      // Allocation changes are actual-quantity changes, so billed quantity
      // follows the new actual value. Direct billed edits do not do this.
      return {
        ...current,
        [stockRowId]: applyAllocationQuantities(
          savedEdit,
          nextActualQty,
          nextActualQty,
        ),
      };
    });
  };

  const addAllocationsToCart = async () => {
    if (!selectedProduct) return;
    if (!beginGodownCartAddition()) return;

    try {
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
        const configuredItem = applyAllocationQuantities(
          { ...item, ...pendingEdit },
          quantity,
          pendingEdit?.billedQty ?? quantity,
        );
        nextItems = mergeSaleItem(nextItems, configuredItem, taxType);
      }

      setStagedItems(calculateSaleItems(nextItems, taxType).items);
      showGodownCartAdditionSuccess();
    } catch (error) {
      // Do not reset allocation state when the existing add flow fails.
      handleGodownCartAdditionError(error);
    }
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
    setEditingItem(
      applyAllocationQuantities(
        item,
        quantity,
        savedEdit?.billedQty ?? quantity,
      ),
    );
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
            <Pressable onPress={onClose} className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-slate-100"><X color="#475569" size={19} /></Pressable>
          </View>
          <View className="mt-4 flex-row gap-2"><View className="flex-1 flex-row items-center rounded-2xl border border-slate-300 bg-slate-50 px-4"><Search color="#64748b" size={18}/><TextInput value={search} onChangeText={setSearch} placeholder="Search products" className="ml-3 flex-1 py-3.5 text-[14px]" /></View><Pressable onPress={() => setIsFilterOpen(true)} className="h-[50px] w-[50px] items-center justify-center rounded-2xl border border-slate-300"><SlidersHorizontal color="#134074" size={19}/>{activeFilterCount ? <Text className="absolute right-1 top-0 text-[10px] font-bold text-[#134074]">{activeFilterCount}</Text> : null}</Pressable></View>
          <Pressable onPress={() => setIsPriceLevelOpen(true)} className="mt-3 flex-row items-center rounded-xl bg-[#EAF2F8] px-4 py-3"><Tags color="#134074" size={17}/><Text className="ml-2 flex-1 text-[12px] font-bold text-[#134074]">{draftPriceLevel?.pricelevel || draftPriceLevel?.name || "Default pricing"}</Text><Text className="text-[11px] text-[#134074]">Change</Text></Pressable>
          {productsQuery.isLoading ? <View className="flex-1 items-center justify-center"><ActivityIndicator color="#134074"/></View> : <FlatList className="mt-3 flex-1" contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false} data={products} keyExtractor={(item, index) => getProductId(item) || String(index)} onEndReached={() => productsQuery.hasNextPage && !productsQuery.isFetchingNextPage && void productsQuery.fetchNextPage()} renderItem={({item}) => { const hasStockRows = getProductStockRows(item).length > 0; const singleGodown = getSingleGodown(item); const pendingItem = singleGodown ? findPendingSingleGodownItem(singleGodown) : null; const loading = loadingProductId === getProductId(item); if (!singleGodown) return <View className={`mb-2 flex-row items-center rounded-2xl border px-4 py-3.5 ${hasStockRows ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}><View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-100"><Package color="#db2777" size={20}/></View><View className="ml-3 flex-1"><Text className="text-[14px] font-bold text-slate-900">{item.product_name || item.name || "Untitled product"}</Text><Text className="mt-1 text-[11px] text-slate-500">{hasStockRows ? "Select stock allocation" : "No stock allocation rows"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Add ${item.product_name || "product"}`} disabled={!hasStockRows || loading} onPress={() => void selectProduct(item)} className="h-9 w-9 items-center justify-center rounded-full bg-[#134074]">{loading ? <ActivityIndicator color="#ffffff" size="small"/> : <Plus color="#ffffff" size={18}/>}</Pressable></View>; const quantity = pendingItem?.billedQty ?? 0; const lineTotal = pendingItem ? calculateSaleItems([pendingItem], taxType).items[0].totalAmount : 0; return <View className="mb-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5"><View className="flex-row items-center"><View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-100"><Package color="#db2777" size={20}/></View><View className="ml-3 flex-1 pr-3"><Text className="text-[14px] font-bold text-slate-900">{item.product_name || item.name || "Untitled product"}</Text><Text className="mt-1 text-[11px] text-slate-500">Single stock allocation</Text></View>{pendingItem ? <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.product_name || "product"}`} disabled={loading} onPress={() => void openSingleGodownEditor(item)} className="flex-row items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-2"><Pencil color="#0284c7" size={13}/><Text className="ml-1 text-[11px] font-bold text-sky-700">Edit</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel={`Add ${item.product_name || "product"}`} disabled={loading} onPress={() => void changeSingleGodownQuantity(item, 1)} className="h-9 w-9 items-center justify-center rounded-full bg-[#134074]">{loading ? <ActivityIndicator color="#ffffff" size="small"/> : <Plus color="#ffffff" size={18}/>}</Pressable>}</View>{pendingItem ? <View className="mt-3 flex-row items-center border-t border-slate-100 pt-3"><Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${item.product_name || "product"} quantity`} disabled={loading || quantity === 0} onPress={() => void changeSingleGodownQuantity(item, -1)} className="h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50"><Minus color="#e11d48" size={15}/></Pressable><Text className="min-w-12 text-center text-[14px] font-extrabold text-slate-900">{quantity}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Increase ${item.product_name || "product"} quantity`} disabled={loading} onPress={() => void changeSingleGodownQuantity(item, 1)} className="h-8 w-8 items-center justify-center rounded-lg border border-[#A9C4D8] bg-[#EAF2F8]">{loading ? <ActivityIndicator color="#134074" size="small"/> : <Plus color="#134074" size={15}/>}</Pressable><View className="ml-auto items-end"><Text className="text-[10px] text-slate-500">Line total</Text><Text className="mt-0.5 text-[13px] font-extrabold text-slate-900">{lineTotal.toFixed(2)}</Text></View></View> : null}</View>; }} ListEmptyComponent={<Text className="py-10 text-center text-slate-500">No saleable products found.</Text>} ListFooterComponent={productsQuery.isFetchingNextPage ? <ActivityIndicator color="#134074"/> : null}/>}
          <View className="mt-3 flex-row gap-2 border-t border-slate-200 pt-3">
            <Pressable disabled={stagedItems.length === 0} onPress={() => setIsCartOpen(true)} className={`flex-1 rounded-xl py-3 ${stagedItems.length ? "bg-[#EAF2F8]" : "bg-slate-100"}`}><Text className={`text-center text-[11px] font-bold ${stagedItems.length ? "text-[#134074]" : "text-slate-400"}`}>View Cart</Text></Pressable>
            <Pressable disabled={!Object.values(pendingSingleGodownItems).some((item) => item.actualQty > 0) || mainCartAdditionState !== "idle"} onPress={addSingleGodownItemsToCart} className={`flex-1 items-center justify-center rounded-xl py-3 ${Object.values(pendingSingleGodownItems).some((item) => item.actualQty > 0) || mainCartAdditionState !== "idle" ? "bg-[#134074]" : "bg-slate-300"}`}><AddToCartButtonContent state={mainCartAdditionState}/></Pressable>
            <Pressable onPress={() => onConfirm(stagedItems, draftPriceLevel)} className="flex-1 rounded-xl bg-[#134074] py-3"><Text className="text-center text-[11px] font-bold text-white">Continue</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
    <ProductFilterModal visible={visible && isFilterOpen} companyId={companyId} appliedFilters={filters} onClose={() => setIsFilterOpen(false)} onApply={setFilters}/>
    <PriceLevelSelectionModal visible={visible && isPriceLevelOpen} priceLevels={priceLevelsQuery.data ?? []} selectedPriceLevel={draftPriceLevel} onClose={() => setIsPriceLevelOpen(false)} onSelect={requestPriceLevelChange}/>
    <PriceLevelChangeConfirmation visible={isPriceLevelChangeConfirmationOpen} onCancel={cancelPriceLevelChange} onConfirm={confirmPriceLevelChange}/>
    <Modal visible={Boolean(selectedProduct)} transparent animationType="slide" onRequestClose={() => setSelectedProduct(null)}><View className="flex-1 justify-end bg-black/35"><View className="h-[82%] rounded-t-[28px] bg-white px-5 pt-5" style={{paddingBottom: insets.bottom + 12}}><View className="flex-row justify-between"><View className="flex-1 pr-3"><Text className="text-[18px] font-extrabold">Choose stock allocation</Text><Text className="mt-1 text-[12px] text-slate-500">Add quantities by godown and batch, then add them together.</Text></View><Pressable onPress={() => setSelectedProduct(null)}><X color="#475569" size={20}/></Pressable></View><FlatList className="mt-4 flex-1" data={selectedProduct?.GodownList ?? []} keyExtractor={(row, index) => getStockRowId(row) || String(index)} renderItem={({item}) => { const rowId = getStockRowId(item); const quantity = allocationQuantities[rowId] ?? 0; const remaining = getRemainingStock(item, stagedItems); const godown = getGodownSnapshot(item); const pendingEdit = pendingAllocationEdits[rowId]; const billedQuantity = pendingEdit?.billedQty ?? quantity; const baseItem = pendingEdit ?? createSaleItem(selectedProduct as Product, item, { rate: resolvedPricing?.rate ?? 0, priceSource: resolvedPricing?.source ?? "manual", priceLevelId: draftPriceLevel?._id ?? null, taxType }); const previewItem = calculateSaleItems([applyAllocationQuantities(baseItem, quantity, billedQuantity)], taxType).items[0]; return <View className="mb-3 rounded-[22px] border border-slate-200 bg-white p-4"><View className="flex-row items-start"><View className="flex-1 pr-3"><Text className="text-[14px] font-extrabold text-slate-900">{godown.name || "Godown name unavailable"}</Text>{item.batch ? <Text className="mt-1 text-[12px] text-slate-600">Batch {item.batch}</Text> : null}<Text className={`mt-2 text-[12px] font-bold ${remaining < 0 ? "text-rose-600" : "text-[#134074]"}`}>Available {remaining}</Text><Text className="mt-1 text-[11px] text-slate-500">Rate {previewItem.rate.toFixed(2)}</Text>{item.mfgdt || item.expdt ? <Text className="mt-1 text-[11px] text-slate-500">{item.mfgdt ? `Mfg ${formatDate(item.mfgdt)}` : ""}{item.mfgdt && item.expdt ? " · " : ""}{item.expdt ? `Exp ${formatDate(item.expdt)}` : ""}</Text> : null}</View><Pressable onPress={() => void openAllocationEditor(item)} className="flex-row items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-2"><Pencil color="#0284c7" size={14}/><Text className="ml-1 text-[12px] font-bold text-sky-700">Edit</Text></Pressable></View><View className="mt-4 flex-row items-center border-t border-slate-100 pt-3"><Pressable onPress={() => changeAllocationQuantity(rowId, -1)} className="h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50"><Minus color="#e11d48" size={18}/></Pressable><Text className="min-w-14 text-center text-[18px] font-extrabold text-slate-900">{billedQuantity}</Text><Pressable onPress={() => changeAllocationQuantity(rowId, 1)} className="h-10 w-10 items-center justify-center rounded-xl border border-[#A9C4D8] bg-[#EAF2F8]"><Plus color="#134074" size={18}/></Pressable><View className="ml-auto items-end"><Text className="text-[10px] text-slate-500">Total</Text><Text className="mt-0.5 text-[14px] font-extrabold text-slate-900">{previewItem.totalAmount.toFixed(2)}</Text></View></View></View>; }}/><Pressable disabled={!Object.values(allocationQuantities).some((quantity) => quantity > 0) || godownCartAdditionState !== "idle"} onPress={() => void addAllocationsToCart()} className={`mt-3 items-center justify-center rounded-2xl py-4 ${Object.values(allocationQuantities).some((quantity) => quantity > 0) || godownCartAdditionState !== "idle" ? "bg-[#134074]" : "bg-slate-300"}`}><AddToCartButtonContent state={godownCartAdditionState}/></Pressable></View></View></Modal>
    <SaleAllItemsModal visible={isCartOpen} items={stagedItems} totals={calculateSaleItems(stagedItems, taxType).totals} onClose={() => setIsCartOpen(false)} onEdit={(item) => { setIsCartOpen(false); setEditingStagedItem(item); }} onRemove={(itemId) => setStagedItems((current) => calculateSaleItems(current.filter((item) => item.id !== itemId), taxType).items)}/>
    <SaleOrderItemEditModal visible={Boolean(editingItem)} item={editingItem} taxType={taxType} onClose={() => { setEditingSingleGodownStockRowId(""); setEditingItem(null); }} onRemove={() => editingItem && (editingSingleGodownStockRowId ? discardEditedSingleGodownItem() : discardPendingAllocationEdit(editingItem))} onSave={(item) => editingSingleGodownStockRowId ? saveEditedSingleGodownItem(item as SaleItem) : saveEditedAllocation(item as SaleItem)}/>
    <SaleOrderItemEditModal visible={Boolean(editingStagedItem)} item={editingStagedItem} taxType={taxType} onClose={() => setEditingStagedItem(null)} onRemove={() => editingStagedItem && removeEditedStagedItem(editingStagedItem)} onSave={(item) => saveEditedStagedItem(item as SaleItem)}/>
  </>;
}
