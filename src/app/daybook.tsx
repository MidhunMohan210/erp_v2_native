import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  CalendarDays,
  FileText,
  SlidersHorizontal,
} from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import {
  DaybookFilterSheet,
  getDefaultDaybookFilters,
} from "@/components/daybook/DaybookFilterSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useDaybookQuery } from "@/hooks/queries/voucherQueries";
import { usePendingSubmissionsQuery } from "@/hooks/queries/pendingSubmissionQueries";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { pendingSubmissionRetryService } from "@/services/pendingSubmissions/pendingSubmissionRetry.service";
import { getPendingSubmissionDisplayData } from "@/services/pendingSubmissions/pendingSubmissionDisplay.service";
import { partyQueryKeys } from "@/hooks/queries/partyQueries";
import { partyService } from "@/services/party.service";
import { useAppSelector } from "@/store/hooks";
import { AppText } from "@/components/ui/AppText";
import type {
  DaybookFilters,
  VoucherListItem,
  VoucherType,
} from "@/types/voucher";
import type { PendingSubmission } from "@/services/pendingSubmissions/pendingSubmission.types";
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

type DaybookListEntry = VoucherListItem | PendingSubmission;

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

function getPendingStatusText(status: PendingSubmission["status"]): string {
  if (status === "retry_available") return "Not found on server — Retry available";
  if (status === "conflict") return "Submission conflict — needs attention";
  if (status === "rejected") return "Rejected — create a new submission";
  if (status === "checking") return "Checking status...";
  return "Unable to confirm yet";
}

function getPendingStatusTextClass(status: PendingSubmission["status"]): string {
  if (status === "retry_available") return "text-emerald-700";
  if (status === "conflict" || status === "rejected") return "text-rose-700";
  return "text-amber-700";
}

function getPendingStatusClass(status: PendingSubmission["status"]): string {
  if (status === "retry_available") return "bg-emerald-50 text-emerald-700";
  if (status === "conflict" || status === "rejected") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

export default function DaybookScreen() {
  const params = useLocalSearchParams<{ dateRange?: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const userId = useAppSelector((state) => state.auth.user?._id ?? "");
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
  const [activeView, setActiveView] = useState<"transactions" | "pending">(
    "transactions",
  );
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const retryGuardRef = useRef(new Set<string>());

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
    Boolean(selectedCompany?._id) && activeView === "transactions",
  );
  const pendingQuery = usePendingSubmissionsQuery(
    userId,
    selectedCompany?._id ?? "",
    Boolean(selectedCompany?._id),
  );
  const vouchers = useMemo(
    () =>
      daybookQuery.data?.pages.flatMap((page) => page.vouchers) ?? [],
    [daybookQuery.data],
  );
  const totalCount = daybookQuery.data?.pages[0]?.count ?? vouchers.length;
  const pendingSubmissions = useMemo(
    () => pendingQuery.data ?? [],
    [pendingQuery.data],
  );
  const pendingSalePartyIds = useMemo(
    () => Array.from(new Set(
      pendingSubmissions
        .filter((submission) => submission.transactionType === "sale")
        .map((submission) => getPendingSubmissionDisplayData(submission).partyId)
        .filter((partyId): partyId is string => Boolean(partyId)),
    )),
    [pendingSubmissions],
  );
  const pendingSalePartyQueries = useQueries({
    queries: pendingSalePartyIds.map((partyId) => ({
      queryKey: partyQueryKeys.detail(partyId),
      queryFn: () => partyService.getPartyById(partyId),
      enabled: activeView === "pending",
      staleTime: 30_000,
    })),
  });
  const pendingSalePartyNames = useMemo(
    () => new Map(
      pendingSalePartyIds.map((partyId, index) => [
        partyId,
        pendingSalePartyQueries[index]?.data?.partyName,
      ]),
    ),
    [pendingSalePartyIds, pendingSalePartyQueries],
  );
  const listEntries: DaybookListEntry[] =
    activeView === "pending" ? pendingSubmissions : vouchers;
  const visibleCount =
    activeView === "pending" ? pendingSubmissions.length : totalCount;

  const invalidateConfirmedTransaction = async (
    submission: PendingSubmission,
  ) => {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.daybook }),
    ];
    if (submission.transactionType === "receipt") {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.receipts }),
      );
    } else if (submission.transactionType === "sale") {
      invalidations.push(queryClient.invalidateQueries({ queryKey: ["sales"] }));
    } else {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.saleOrders }),
      );
    }
    await Promise.all(invalidations);
  };

  const handleRetryPendingSubmission = async (submission: PendingSubmission) => {
    if (retryGuardRef.current.has(submission.id)) return;
    retryGuardRef.current.add(submission.id);
    setRetryingId(submission.id);
    try {
      const result = await pendingSubmissionRetryService.retry(submission);
      if (result.status === "success") {
        await invalidateConfirmedTransaction(submission);
        toast.success(result.wasReplay ? "Submission recovered successfully" : "Submission created");
      } else if (result.status === "conflict") {
        toast.error("Submission conflict — needs attention.");
      } else if (result.status === "rejected") {
        toast.error(result.message);
      } else {
        toast.error("Unable to confirm whether the submission was saved.");
      }
    } finally {
      retryGuardRef.current.delete(submission.id);
      setRetryingId(null);
    }
  };

  const handleCheckPendingSubmission = async (submission: PendingSubmission) => {
    if (checkingId === submission.id) return;
    setCheckingId(submission.id);
    try {
      const result = await pendingSubmissionRetryService.checkStatus(submission);
      if (result.status === "found") {
        await invalidateConfirmedTransaction(submission);
        toast.success("Submission was confirmed.");
      } else if (result.status === "not_found") {
        toast("Not found on server. Retry is now available.");
      } else {
        toast("Still unable to confirm the submission status.");
      }
    } finally {
      setCheckingId(null);
    }
  };

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

      <View className="px-4 pt-3">
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
              {(activeView === "pending" ? pendingQuery.isLoading : daybookQuery.isLoading) ? <ActivityIndicator color="#134074" size="small" /> : <AppText className="text-[16px] font-extrabold text-[#134074]">{visibleCount}</AppText>}
              <AppText className="text-[9px] font-bold uppercase tracking-[0.8px] text-slate-500">
                {activeView === "pending" ? "Pending" : "Entries"}
              </AppText>
            </View>
          </View>

          <View className="mt-4 flex-row items-center border-t border-white/10 pt-4">
            <View className="h-2 w-2 rounded-full bg-blue-200" />
            <AppText
              numberOfLines={1}
              className="ml-2 flex-1 text-[12px] font-semibold text-blue-100"
            >
              {activeView === "pending"
                ? "Local recovery submissions only"
                : summarizeVoucherTypes(filters.voucherTypes)}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change daybook filters"
              onPress={() => setFiltersVisible(true)}
              hitSlop={8}
            >
              <AppText className="text-[12px] font-extrabold text-white">
                {activeView === "pending" ? "Pending" : "Change"}
              </AppText>
            </Pressable>
          </View>
        </View>

        <View className="mb-3 flex-row gap-2 px-1">
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveView("transactions")}
            className={`rounded-full px-4 py-2 ${activeView === "transactions" ? "bg-[#134074]" : "bg-white"}`}
          >
            <AppText className={`text-[12px] font-bold ${activeView === "transactions" ? "text-white" : "text-slate-600"}`}>
              Transactions
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveView("pending")}
            className={`rounded-full px-4 py-2 ${activeView === "pending" ? "bg-[#134074]" : "bg-white"}`}
          >
            <AppText className={`text-[12px] font-bold ${activeView === "pending" ? "text-white" : "text-slate-600"}`}>
              Pending ({pendingSubmissions.length})
            </AppText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={listEntries}
        keyExtractor={(item) => ("transactionType" in item ? item.id : item._id)}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 0,
          paddingBottom: insets.bottom + 32,
          flexGrow: listEntries.length === 0 ? 1 : undefined,
        }}
        refreshing={activeView === "pending"
          ? pendingQuery.isRefetching
          : daybookQuery.isRefetching && !daybookQuery.isFetchingNextPage}
        onRefresh={() => void (activeView === "pending" ? pendingQuery.refetch() : daybookQuery.refetch())}
        onEndReached={() => {
          if (activeView === "transactions" && daybookQuery.hasNextPage && !daybookQuery.isFetchingNextPage) {
            void daybookQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          (activeView === "pending" ? pendingQuery.isLoading : daybookQuery.isLoading) ? (
            <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14">
              <ActivityIndicator color="#134074" size="large" />
              <Text className="mt-3 text-[13px] text-slate-500">Loading transactions...</Text>
            </View>
          ) : activeView === "transactions" && daybookQuery.isError ? (
            <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14">
              <Text className="text-[15px] font-extrabold text-slate-800">Could not load daybook</Text>
              <Text className="mt-2 text-center text-[12px] leading-5 text-slate-500">Please check the connection and try again.</Text>
              <Pressable accessibilityRole="button" onPress={() => void daybookQuery.refetch()} className="mt-5 rounded-2xl bg-[#134074] px-5 py-3"><Text className="text-[13px] font-bold text-white">Try Again</Text></Pressable>
            </View>
          ) : activeView === "pending" && pendingQuery.isError ? (
          <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14">
            <Text className="text-[15px] font-extrabold text-slate-800">Could not load pending submissions</Text>
            <Pressable accessibilityRole="button" onPress={() => void pendingQuery.refetch()} className="mt-5 rounded-2xl bg-[#134074] px-5 py-3"><Text className="text-[13px] font-bold text-white">Try Again</Text></Pressable>
          </View>
          ) : (
          <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <FileText color="#64748b" size={24} />
            </View>
            <Text className="mt-4 text-[15px] font-extrabold text-slate-800">
              {activeView === "pending" ? "No pending submissions" : "No transactions found"}
            </Text>
            <Text className="mt-1 text-center text-[12px] leading-5 text-slate-500">
              {activeView === "pending" ? "Confirmed submissions will appear in normal transactions." : "Try another date range or voucher type."}
            </Text>
            {activeView === "transactions" ? <Pressable
              accessibilityRole="button"
              onPress={() => setFiltersVisible(true)}
              className="mt-5 rounded-2xl bg-[#134074] px-5 py-3"
            >
              <Text className="text-[13px] font-bold text-white">
                Adjust filters
              </Text>
            </Pressable> : null}
          </View>
          )
        }
        ListFooterComponent={
          activeView === "transactions" && daybookQuery.isFetchingNextPage ? (
            <View className="items-center py-5">
              <ActivityIndicator color="#2563eb" />
              <Text className="mt-2 text-[11px] text-slate-400">
                Loading more entries...
              </Text>
            </View>
          ) : activeView === "transactions" && vouchers.length > 0 ? (
            <Text className="py-5 text-center text-[11px] text-slate-400">
              {daybookQuery.hasNextPage ? "Scroll to load more" : "End of entries"}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          if ("transactionType" in item) {
            const display = getPendingSubmissionDisplayData(item);
            const partyName =
              item.transactionType === "sale"
                ? pendingSalePartyNames.get(display.partyId ?? "") ?? display.partyName
                : display.partyName;
            const canRetry = item.status === "retry_available";
            const canCheck = item.status === "uncertain" || item.status === "checking";
            const isRetrying = retryingId === item.id;
            const isChecking = checkingId === item.id;

            return (
              <View className="mb-2.5 rounded-2xl border border-amber-100 bg-white px-4 py-3.5 shadow-sm">
                <View className="flex-row items-start">
                  <View className="min-w-0 flex-1 pr-3">
                    <AppText numberOfLines={1} className="text-[14px] font-semibold text-slate-700">
                      {partyName}
                    </AppText>
                    <AppText className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.5px] text-[#134074]">
                      {display.title}
                    </AppText>
                  </View>
                  <View className="items-end">
                    {display.amount !== null ? <AppText className="text-[14px] font-extrabold text-slate-900">₹{formatAmount(display.amount)}</AppText> : null}
                    <AppText className="mt-1 text-[10px] text-slate-400">
                      {formatDisplayDate(display.transactionDate ?? item.createdAt)}
                    </AppText>
                  </View>
                </View>
                <View className={`mt-3 self-start rounded-full px-2.5 py-1 ${getPendingStatusClass(item.status)}`}>
                  <AppText className={`text-[10px] font-bold ${getPendingStatusTextClass(item.status)}`}>
                    {getPendingStatusText(item.status)}
                  </AppText>
                </View>
                <View className="mt-3 flex-row gap-2">
                  {canRetry ? <Pressable
                    accessibilityRole="button"
                    disabled={isRetrying}
                    onPress={() => void handleRetryPendingSubmission(item)}
                    className={`rounded-xl bg-[#134074] px-4 py-2.5 ${isRetrying ? "opacity-60" : ""}`}
                  >
                    <Text className="text-[12px] font-bold text-white">
                      {isRetrying ? "Retrying..." : "Retry"}
                    </Text>
                  </Pressable> : null}
                  {canCheck ? <Pressable
                    accessibilityRole="button"
                    disabled={isChecking}
                    onPress={() => void handleCheckPendingSubmission(item)}
                    className={`rounded-xl border border-[#134074] px-4 py-2.5 ${isChecking ? "opacity-60" : ""}`}
                  >
                    <Text className="text-[12px] font-bold text-[#134074]">
                      {isChecking ? "Checking..." : "Check status"}
                    </Text>
                  </Pressable> : null}
                </View>
              </View>
            );
          }

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
                      className="min-w-0 flex-1 text-[14px] font-semibold text-slate-700"
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
