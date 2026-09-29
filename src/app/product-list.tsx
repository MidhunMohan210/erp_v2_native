import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Package, Plus, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { isAxiosError } from "axios";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useArchiveProductMutation, useInfiniteProductListQuery } from "@/hooks/queries/productQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAppSelector } from "@/store/hooks";
import type { Product } from "@/types/product";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import DeleteConfirmSheet from "@/components/DeleteConfirmSheet";

const PAGE_SIZE = 20;

function ProductRow({ product, onPress, onDelete }: { product: Product; onPress: () => void; onDelete: () => void }) {
  const subtitle = [product.product_code ? `Code: ${product.product_code}` : null]
    .filter(Boolean)
    .join(" | ");

  return (
    <Pressable onPress={onPress} className="mb-3 flex-row items-center justify-between rounded-[14px] border-b border-slate-200 bg-slate-50 px-4 py-[14px] shadow-sm shadow-slate-900/10">
      <View className="flex-1 flex-row items-center">
        <View className="items-center justify-center rounded-[10px] bg-rose-100 p-2">
          <Package color="#db2777" size={22} strokeWidth={2.1} />
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="shrink text-[15px] font-extrabold text-[#0f172a]"
          >
            {product.product_name || "Untitled Product"}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-sm text-slate-500">
            {subtitle || "No product details"}
          </Text>
          <View className={`mt-2 self-start rounded-full px-2 py-0.5 ${product.product_source === "manual" ? "bg-emerald-100" : "bg-blue-100"}`}><Text className={`text-[10px] font-bold ${product.product_source === "manual" ? "text-emerald-700" : "text-blue-700"}`}>{product.product_source === "manual" ? "Manual" : "Tally"}</Text></View>
        </View>
      </View>
      {product.product_source === "manual" ? <Pressable onPress={(event) => { event.stopPropagation(); onDelete(); }} hitSlop={10} className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-rose-50" accessibilityLabel={`Delete ${product.product_name ?? "product"}`}><Trash2 color="#e11d48" size={17} strokeWidth={2.2}/></Pressable> : null}
    </Pressable>
  );
}

function ProductSkeletonList() {
  return (
    <View className="px-4 pt-[14px]">
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={index}
          className="mb-3 h-[74px] rounded-[14px] border border-slate-200 bg-white"
        />
      ))}
    </View>
  );
}

export default function ProductList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const [query, setQuery] = useState("");
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const archiveMutation = useArchiveProductMutation();
  const debouncedSearchText = useDebouncedValue(query.trim(), 500);

  const productsQuery = useInfiniteProductListQuery({
    cmp_id: selectedCompany?._id ?? "",
    limit: PAGE_SIZE,
    search: debouncedSearchText,
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [productsQuery.data],
  );

  useEffect(() => {
    if (!productsQuery.isError) {
      return;
    }

    const message =
      isAxiosError(productsQuery.error) &&
      productsQuery.error.response?.data?.message
        ? productsQuery.error.response.data.message
        : productsQuery.error instanceof Error
          ? productsQuery.error.message
          : "Failed to load products";

    toast.error(message);
  }, [productsQuery.error, productsQuery.isError]);

  const handleLoadMore = () => {
    if (!productsQuery.hasNextPage || productsQuery.isFetchingNextPage) {
      return;
    }

    void productsQuery.fetchNextPage();
  };
  const requestDelete = (product: Product) => { setProductToDelete(product); deleteSheetRef.current?.present(); };
  const confirmDelete = async () => {
    if (!selectedCompany?._id || !productToDelete?._id) return;
    try { await archiveMutation.mutateAsync({ cmp_id: selectedCompany._id, productId: productToDelete._id }); deleteSheetRef.current?.dismiss(); setProductToDelete(null); toast.success("Product deleted"); }
    catch (error) { toast.error(isAxiosError(error) && error.response?.data?.message ? error.response.data.message : "Unable to delete product"); }
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title="Products"
        showSearch
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search products"
      />

      {isCompanyLoading ? (
        <ProductSkeletonList />
      ) : !selectedCompany?._id ? (
        <View className="flex-1 px-4 pt-[14px]">
          <View className="rounded-[18px] border border-dashed border-slate-300 bg-white px-5 py-7">
            <Text className="text-center text-[14px] text-slate-500">
              Select a company first to view products.
            </Text>
          </View>
        </View>
      ) : productsQuery.isLoading ? (
        <ProductSkeletonList />
      ) : productsQuery.isError ? (
        <PageError
          title="Could not load products"
          description="Please check the connection and try again."
          onRetry={() => void productsQuery.refetch()}
        />
      ) : (
        <FlatList
          className="flex-1"
          contentContainerClassName="bg-white px-4 pt-[14px]"
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
          data={products}
          keyExtractor={(item, index) =>
            item._id ||
            item.product_master_id ||
            item.product_code ||
            `${item.product_name || "product"}-${index}`
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshing={productsQuery.isRefetching && !productsQuery.isFetchingNextPage}
          onRefresh={() => void productsQuery.refetch()}
          renderItem={({ item }) => <ProductRow product={item} onPress={() => item._id ? router.push(item.product_source === "manual" ? { pathname: "/product-create", params: { id: item._id } } : { pathname: "/product/[id]", params: { id: item._id } }) : undefined} onDelete={() => requestDelete(item)} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="mt-6 items-center rounded-[18px] bg-white px-5 py-7">
              <Text className="text-[18px] font-bold text-[#0f172a]">
                {debouncedSearchText ? "No matching products" : "No products found"}
              </Text>
              <Text className="mt-1.5 text-center text-[14px] text-slate-500">
                Try a different search term or refresh the list.
              </Text>
            </View>
          }
          ListFooterComponent={
            productsQuery.isFetchingNextPage ? (
              <View className="items-center py-4">
                <ActivityIndicator color="#134074" size="small" />
                <Text className="mt-2 text-sm font-medium text-slate-700">
                  Loading more products...
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {selectedCompany?._id ? (
        <Pressable
          onPress={() => router.push("/product-create")}
          className="absolute bottom-6 right-5 flex-row items-center rounded-full bg-[#134074] px-5 py-3.5"
        >
          <Plus color="#ffffff" size={20} strokeWidth={2.5} />
          <Text className="ml-2 text-[14px] font-bold text-white">Add Product</Text>
        </Pressable>
      ) : null}
      <DeleteConfirmSheet sheetRef={deleteSheetRef} title="Delete Product" description={productToDelete ? `Delete ${productToDelete.product_name ?? "this product"}? It will no longer appear in active product lists or selection screens.` : "Delete this product?"} onConfirm={() => void confirmDelete()} isLoading={archiveMutation.isPending}/>
    </View>
  );
}
