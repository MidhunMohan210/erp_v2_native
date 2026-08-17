import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { FileText, SlidersHorizontal } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import {
  DaybookFilterSheet,
  getDefaultDaybookFilters,
} from "@/components/daybook/DaybookFilterSheet";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useDaybookQuery } from "@/hooks/queries/voucherQueries";
import { useAppSelector } from "@/store/hooks";
import { AppText } from "@/components/ui/AppText";
import type {
  DaybookFilters,
  VoucherListItem,
  VoucherType,
} from "@/types/voucher";

function formatAmount(value?: number) {
  return Number(value ?? 0).toFixed(2);
}

function formatDisplayDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getVoucherLabel(type: string) {
  return type === "saleOrder" ? "Sale Order" : "Receipt";
}

function summarizeVoucherTypes(types: VoucherType[]) {
  if (types.length === 0 || types.length === 2) return "All voucher types";
  return types.map(getVoucherLabel).join(", ");
}

export default function DaybookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const isCompanyLoading = useAppSelector(
    (state) => state.company.isLoading,
  );
  const [filters, setFilters] = useState<DaybookFilters>(
    getDefaultDaybookFilters,
  );
  const [filtersVisible, setFiltersVisible] = useState(false);

  const daybookQuery = useDaybookQuery(
    selectedCompany?._id ?? "",
    filters,
    Boolean(selectedCompany?._id),
  );
  const vouchers = useMemo(
    () =>
      daybookQuery.data?.pages.flatMap((page) => page.vouchers) ?? [],
    [daybookQuery.data],
  );
  const totalCount = daybookQuery.data?.pages[0]?.count ?? vouchers.length;

  const openVoucher = (voucher: VoucherListItem) => {
    if (voucher.voucher_type === "saleOrder") {
      router.push({
        pathname: "/sale-order-detail",
        params: { id: voucher._id },
      });
      return;
    }

    toast("Receipt detail will be added with the receipt phase");
  };

  if (isCompanyLoading) {
    return <PageLoader message="Loading company..." />;
  }

  if (!selectedCompany?._id) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Daybook" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[16px] font-bold text-slate-800">
            No company selected
          </Text>
          <Text className="mt-2 text-center text-[13px] text-slate-500">
            Select a company to view its transactions.
          </Text>
        </View>
      </View>
    );
  }

  if (daybookQuery.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Daybook" />
        <PageLoader message="Loading transactions..." />
      </View>
    );
  }

  if (daybookQuery.isError) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Daybook" />
        <PageError
          title="Could not load daybook"
          description="Please check the connection and try again."
          onRetry={() => void daybookQuery.refetch()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Daybook"
        rightContent={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open daybook filters"
            onPress={() => setFiltersVisible(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-blue-50"
          >
            <SlidersHorizontal color="#2563eb" size={19} />
          </Pressable>
        }
      />

      <FlatList
        data={vouchers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: insets.bottom + 32,
          flexGrow: vouchers.length === 0 ? 1 : undefined,
        }}
        refreshing={daybookQuery.isRefetching && !daybookQuery.isFetchingNextPage}
        onRefresh={() => void daybookQuery.refetch()}
        onEndReached={() => {
          if (daybookQuery.hasNextPage && !daybookQuery.isFetchingNextPage) {
            void daybookQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <View className="mb-3 rounded-[15px] border border-blue-100 bg-[#3f5c76] p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <AppText className="text-[11px] font-extrabold uppercase tracking-[1.4px] text-slate-400">
                  Date range
                </AppText>
                <AppText numberOfLines={1} className="mt-1 text-[15px] font-extrabold text-slate-200">
                  {formatDisplayDate(filters.from)} –{" "}
                  {formatDisplayDate(filters.to)}
                </AppText>
                <AppText numberOfLines={1} className="mt-1 text-[12px] text-slate-400">
                  {summarizeVoucherTypes(filters.voucherTypes)}
                </AppText>
              </View>
              <View className="rounded-full bg-white px-3 py-1.5">
                <AppText className="text-[12px] font-extrabold text-blue-700">
                  {totalCount}
                </AppText>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <FileText color="#94a3b8" size={24} />
            </View>
            <Text className="mt-4 text-[15px] font-bold text-slate-700">
              No transactions found
            </Text>
            <Text className="mt-1 text-center text-[12px] text-slate-400">
              Try another date range or voucher type.
            </Text>
          </View>
        }
        ListFooterComponent={
          daybookQuery.isFetchingNextPage ? (
            <View className="items-center py-5">
              <ActivityIndicator color="#2563eb" />
              <Text className="mt-2 text-[11px] text-slate-400">
                Loading more entries...
              </Text>
            </View>
          ) : vouchers.length > 0 ? (
            <Text className="py-5 text-center text-[11px] text-slate-400">
              {daybookQuery.hasNextPage ? "Scroll to load more" : "End of entries"}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isSaleOrder = item.voucher_type === "saleOrder";
          const isCancelled = item.status === "cancelled";
          const isConverted = item.status === "converted";

          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => openVoucher(item)}
              className="mb-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
            >
              <View className="flex-row items-start justify-between gap-4">
                <View className="min-w-0 flex-1">
                  <AppText numberOfLines={1} className="text-[10px] font-bold tracking-[0.7px] text-slate-400">
                    # {item.voucher_number || "Voucher"}
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    className="mt-1 text-[14px] font-extrabold text-slate-900"
                  >
                    {item.party_name || "--"}
                  </AppText>
                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    <AppText className="text-[11px] text-slate-500">
                      {formatDisplayDate(item.date)}
                    </AppText>
                    <View
                      className={`rounded-full px-2.5 py-1 ${
                        isSaleOrder ? "bg-blue-50" : "bg-amber-50"
                      }`}
                    >
                      <AppText
                        className={`text-[10px] font-bold ${
                          isSaleOrder ? "text-blue-700" : "text-amber-700"
                        }`}
                      >
                        {getVoucherLabel(item.voucher_type)}
                      </AppText>
                    </View>
                    {isCancelled || isConverted ? (
                      <View
                        className={`rounded-full px-2.5 py-1 ${
                          isCancelled ? "bg-rose-50" : "bg-violet-50"
                        }`}
                      >
                        <AppText
                          className={`text-[10px] font-bold capitalize ${
                            isCancelled ? "text-rose-700" : "text-violet-700"
                          }`}
                        >
                          {item.status}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
                <AppText numberOfLines={1} className="text-[14px] font-extrabold text-slate-900">
                  <AppText className="text-[10px] font-semibold text-slate-400">
                    Rs.{" "}
                  </AppText>
                  {formatAmount(item.amount)}
                </AppText>
              </View>
            </Pressable>
          );
        }}
      />

      <DaybookFilterSheet
        visible={filtersVisible}
        value={filters}
        onApply={setFilters}
        onClose={() => setFiltersVisible(false)}
      />
    </View>
  );
}
