import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { Package, RefreshCw } from "lucide-react-native";
import { isAxiosError } from "axios";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useInfiniteProductListQuery } from "@/hooks/queries/productQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAppSelector } from "@/store/hooks";
import type { Product } from "@/types/product";

const PAGE_SIZE = 20;

function ProductRow({ product }: { product: Product }) {
  const subtitle = [product.product_code ? `Code: ${product.product_code}` : null]
    .filter(Boolean)
    .join(" | ");

  return (
    <View className="mb-3 flex-row items-center justify-between rounded-[14px] border-b border-slate-200 bg-slate-50 px-4 py-[14px] shadow-sm shadow-slate-900/10">
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
        </View>
      </View>
    </View>
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
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const [query, setQuery] = useState("");
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

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title="Products"
        menuItems={[
          {
            label: "Refresh list",
            icon: RefreshCw,
            onPress: () => void productsQuery.refetch(),
          },
        ]}
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
          renderItem={({ item }) => <ProductRow product={item} />}
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
    </View>
  );
}
