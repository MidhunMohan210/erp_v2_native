import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  ArrowDownToLine,
  CalendarDays,
  ClipboardList,
  FileText,
  ShoppingBag,
  SlidersHorizontal,
} from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
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
import {
  DAYBOOK_VOUCHER_TYPES,
  getTodayDateString,
  getVoucherTypeLabel,
} from "@/utils/voucher";

type VoucherBadgeStyle = {
  backgroundClass: string;
  iconColor: string;
  textClass: string;
};

const voucherBadgeStyles: Record<VoucherType, VoucherBadgeStyle> = {
  saleOrder: {
    backgroundClass: "bg-indigo-50",
    iconColor: "#4f46e5",
    textClass: "text-indigo-700",
  },
  sale: {
    backgroundClass: "bg-emerald-50",
    iconColor: "#047857",
    textClass: "text-emerald-700",
  },
  receipt: {
    backgroundClass: "bg-amber-50",
    iconColor: "#b45309",
    textClass: "text-amber-700",
  },
};

function formatAmount(value?: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
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

function summarizeVoucherTypes(types: VoucherType[]) {
  const hasEveryVoucherType = DAYBOOK_VOUCHER_TYPES.every((voucherType) =>
    types.includes(voucherType),
  );
  if (types.length === 0 || hasEveryVoucherType) return "All voucher types";
  return types.map(getVoucherTypeLabel).join(", ");
}

function formatDateRange(from: string, to: string) {
  if (from === to) return formatDisplayDate(from);
  return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
}

function VoucherIcon({
  voucherType,
  color,
}: {
  voucherType: VoucherType;
  color: string;
}) {
  if (voucherType === "saleOrder") {
    return <ClipboardList color={color} size={20} strokeWidth={2.2} />;
  }

  if (voucherType === "sale") {
    return <ShoppingBag color={color} size={20} strokeWidth={2.2} />;
  }

  return <ArrowDownToLine color={color} size={20} strokeWidth={2.2} />;
}

export default function DaybookScreen() {
  const params = useLocalSearchParams<{ dateRange?: string }>();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const isCompanyLoading = useAppSelector(
    (state) => state.company.isLoading,
  );
  const [filters, setFilters] = useState<DaybookFilters>(() => {
    if (params.dateRange === "today") {
      const today = getTodayDateString();

      return {
        from: today,
        to: today,
        voucherTypes: DAYBOOK_VOUCHER_TYPES,
      };
    }

    return getDefaultDaybookFilters();
  });
  const [filtersVisible, setFiltersVisible] = useState(false);

  useEffect(() => {
    if (params.dateRange !== "today") return;

    const today = getTodayDateString();
    setFilters({
      from: today,
      to: today,
      voucherTypes: DAYBOOK_VOUCHER_TYPES,
    });
  }, [params.dateRange]);

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

    if (voucher.voucher_type === "sale") {
      router.push({
        pathname: "/sale-detail",
        params: { id: voucher._id },
      });
      return;
    }

    if (voucher.voucher_type === "receipt") {
      router.push({
        pathname: "/receipt-detail",
        params: { id: voucher._id },
      });
      return;
    }

    toast("Transaction detail is not available");
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
            className="h-10 w-10 items-center justify-center rounded-full bg-[#134074]/10"
          >
            <SlidersHorizontal color="#134074" size={19} />
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
          <View>
            <View className="mb-5 rounded-2xl bg-[#3f5c76] p-5 shadow-sm">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <CalendarDays color="#dbeafe" size={21} strokeWidth={2.2} />
                </View>
                <View className="ml-3 flex-1">
                  <AppText className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-blue-100">
                    Showing transactions for
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    className="mt-1 text-[16px] font-extrabold text-white"
                  >
                    {formatDateRange(filters.from, filters.to)}
                  </AppText>
                </View>
                <View className="items-center rounded-2xl bg-white px-3.5 py-2">
                  <AppText className="text-[16px] font-extrabold text-[#134074]">
                    {totalCount}
                  </AppText>
                  <AppText className="text-[9px] font-bold uppercase tracking-[0.8px] text-slate-500">
                    Entries
                  </AppText>
                </View>
              </View>

              <View className="mt-4 flex-row items-center border-t border-white/10 pt-4">
                <View className="h-2 w-2 rounded-full bg-blue-200" />
                <AppText
                  numberOfLines={1}
                  className="ml-2 flex-1 text-[12px] font-semibold text-blue-100"
                >
                  {summarizeVoucherTypes(filters.voucherTypes)}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change daybook filters"
                  onPress={() => setFiltersVisible(true)}
                  hitSlop={8}
                >
                  <AppText className="text-[12px] font-extrabold text-white">
                    Change
                  </AppText>
                </Pressable>
              </View>
            </View>

            <View className="mb-3 px-1">
              <AppText className="text-[15px] font-extrabold text-slate-900">
                Transactions
              </AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <FileText color="#64748b" size={24} />
            </View>
            <Text className="mt-4 text-[15px] font-extrabold text-slate-800">
              No transactions found
            </Text>
            <Text className="mt-1 text-center text-[12px] leading-5 text-slate-500">
              Try another date range or voucher type.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFiltersVisible(true)}
              className="mt-5 rounded-2xl bg-[#134074] px-5 py-3"
            >
              <Text className="text-[13px] font-bold text-white">
                Adjust filters
              </Text>
            </Pressable>
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
          const badgeStyle =
            voucherBadgeStyles[item.voucher_type as VoucherType] ??
            voucherBadgeStyles.receipt;
          const isCancelled = item.status === "cancelled";
          const isConverted = item.status === "converted";
          const voucherType = item.voucher_type as VoucherType;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${getVoucherTypeLabel(voucherType)} ${
                item.voucher_number || "voucher"
              }`}
              onPress={() => openVoucher(item)}
              className="mb-2.5 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm active:opacity-80"
            >
              <View className="flex-row items-center">
                {/* <View
                  className={`h-10 w-10 items-center justify-center rounded-xl ${badgeStyle.backgroundClass}`}
                >
                  <VoucherIcon
                    voucherType={voucherType}
                    color={badgeStyle.iconColor}
                  />
                </View> */}

                <View className="ml-3 min-w-0 flex-1">
                  <View className="flex-row items-center">
                    <AppText
                      numberOfLines={1}
                      className="min-w-0 flex-1 text-[14px] font-extrabold text-slate-900"
                    >
                      {item.party_name || "No party name"}
                    </AppText>
                    {isCancelled || isConverted ? (
                      <View
                        className={`ml-2 rounded-full px-2 py-0.5 ${
                          isCancelled ? "bg-rose-50" : "bg-violet-50"
                        }`}
                      >
                        <AppText
                          className={`text-[9px] font-extrabold uppercase ${
                            isCancelled ? "text-rose-700" : "text-violet-700"
                          }`}
                        >
                          {item.status}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <View className="mt-1.5 flex-row items-center pr-2">
                    <AppText
                      className={`text-[10px] font-extrabold uppercase tracking-[0.5px] ${badgeStyle.textClass}`}
                    >
                      {getVoucherTypeLabel(voucherType)}
                    </AppText>
                    <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />
                    <AppText
                      numberOfLines={1}
                      className="min-w-0 flex-1 text-[11px] text-slate-500"
                    >
                      {item.voucher_number || "Voucher number unavailable"}
                    </AppText>
                  </View>
                </View>

                <View className="ml-3 items-end">
                  <AppText
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    className="text-[14px] font-extrabold text-slate-900"
                  >
                    ₹{formatAmount(item.amount)}
                  </AppText>
                  <AppText className="mt-1.5 text-[10px] text-slate-400">
                    {formatDisplayDate(item.date)}
                  </AppText>
                </View>
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
