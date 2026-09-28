import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TransactionDateSelector } from "@/components/voucher-create/TransactionDateSelector";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useInfiniteCashBankTransactionsQuery } from "@/hooks/queries/cashBankQueries";
import { useAppSelector } from "@/store/hooks";
import type {
  CashBankTransaction,
  CashBankTransactionFilters,
} from "@/services/cashTransaction.service";

const EMPTY_FILTERS: CashBankTransactionFilters = {};

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(value) || 0));
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TransactionRow({ transaction }: { transaction: CashBankTransaction }) {
  const isIn = transaction.direction === "in";
  const canOpen =
    transaction.voucher_type === "sale" ||
    transaction.voucher_type === "receipt";
  const openVoucher = () => {
    if (transaction.voucher_type === "sale")
      router.push({
        pathname: "/sale-detail",
        params: { id: transaction.voucher_id },
      });
    if (transaction.voucher_type === "receipt")
      router.push({
        pathname: "/receipt-detail",
        params: { id: transaction.voucher_id },
      });
  };

  return (
    <Pressable
      disabled={!canOpen}
      onPress={openVoucher}
      className="mb-2.5 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm active:opacity-80"
    >
      <View className="flex-row items-start">
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${isIn ? "bg-emerald-50" : "bg-rose-50"}`}
        >
          {isIn ? (
            <ArrowDownLeft color="#047857" size={20} />
          ) : (
            <ArrowUpRight color="#e11d48" size={20} />
          )}
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[14px] font-extrabold text-slate-800"
          >
            {transaction.voucher_number || "Voucher"}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[11px] text-slate-500">
            {transaction.voucher_type.toUpperCase()} ·{" "}
          </Text>
          <Text className="mt-1 text-[10px] text-slate-400">
            {formatDate(transaction.date)}
          </Text>
        </View>
        <View className="ml-3 items-end">
          <Text
            className={`text-[15px] font-extrabold ${isIn ? "text-emerald-700" : "text-rose-600"}`}
          >
            {isIn ? "+" : "−"}₹{formatAmount(transaction.amount)}
          </Text>
          <Text
            className={`mt-1 text-[10px] font-extrabold ${isIn ? "text-emerald-700" : "text-rose-600"}`}
          >
            {isIn ? "IN" : "OUT"}
          </Text>
          <Text className="mt-1 text-[10px] text-slate-400">
            Balance {transaction.running_balance < 0 ? "−" : ""}₹
            {formatAmount(transaction.running_balance)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function FilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: CashBankTransactionFilters;
  onApply: (filters: CashBankTransactionFilters) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const choose = (
    key: "direction" | "voucherType",
    item?: "in" | "out" | "sale" | "receipt",
  ) =>
    setDraft((current) => ({
      ...current,
      [key]: current[key] === item ? undefined : item,
    }));
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="rounded-t-[28px] bg-white px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="flex-row items-center">
            <Text className="flex-1 text-[17px] font-extrabold text-slate-900">
              Transaction filters
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X color="#475569" size={18} />
            </Pressable>
          </View>
          <View className="mt-5 flex-row gap-3">
            <View className="flex-1">
              <TransactionDateSelector
                label="From"
                value={draft.from || ""}
                onChange={(from) =>
                  setDraft((current) => ({ ...current, from }))
                }
              />
            </View>
            <View className="flex-1">
              <TransactionDateSelector
                label="To"
                value={draft.to || ""}
                onChange={(to) => setDraft((current) => ({ ...current, to }))}
              />
            </View>
          </View>
          <Text className="mb-2 mt-5 text-[11px] font-extrabold uppercase tracking-[1px] text-slate-400">
            Direction
          </Text>
          <View className="flex-row gap-2">
            {(["in", "out"] as const).map((item) => (
              <Pressable
                key={item}
                onPress={() => choose("direction", item)}
                className={`rounded-full px-4 py-2.5 ${draft.direction === item ? "bg-[#134074]" : "bg-slate-100"}`}
              >
                <Text
                  className={`text-[12px] font-bold ${draft.direction === item ? "text-white" : "text-slate-600"}`}
                >
                  {item.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="mb-2 mt-5 text-[11px] font-extrabold uppercase tracking-[1px] text-slate-400">
            Voucher type
          </Text>
          <View className="flex-row gap-2">
            {(["sale", "receipt"] as const).map((item) => (
              <Pressable
                key={item}
                onPress={() => choose("voucherType", item)}
                className={`rounded-full px-4 py-2.5 ${draft.voucherType === item ? "bg-[#134074]" : "bg-slate-100"}`}
              >
                <Text
                  className={`text-[12px] font-bold ${draft.voucherType === item ? "text-white" : "text-slate-600"}`}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={() => setDraft({})}
              className="flex-1 items-center rounded-2xl bg-slate-100 py-3"
            >
              <Text className="text-[13px] font-bold text-slate-700">
                Clear
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onApply(draft);
                onClose();
              }}
              className="flex-1 items-center rounded-2xl bg-[#134074] py-3"
            >
              <Text className="text-[13px] font-bold text-white">Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CashBankAccountScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const companyId = useAppSelector(
    (state) => state.company.selectedCompany?._id ?? "",
  );
  const [filters, setFilters] =
    useState<CashBankTransactionFilters>(EMPTY_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const query = useInfiniteCashBankTransactionsQuery(
    companyId,
    params.id ?? "",
    filters,
  );
  const transactions = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const history = query.data?.pages[0];
  if (query.isLoading)
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Account History" />
        <PageLoader message="Loading transactions..." />
      </View>
    );
  if (query.isError || !history)
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Account History" />
        <PageError
          title="Could not load account history"
          description="Please check the connection and try again."
          onRetry={() => void query.refetch()}
        />
      </View>
    );
  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Account History"
        rightContent={
          <Pressable
            onPress={() => setFiltersVisible(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-[#134074]/10"
          >
            <SlidersHorizontal color="#134074" size={19} />
          </Pressable>
        }
      />
      <View className="px-4 pt-3">
        <View className="rounded-2xl bg-[#3f5c76] p-5">
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-blue-100">
            {history.account.type} account
          </Text>
          <Text
            numberOfLines={1}
            className="mt-1 text-[19px] font-extrabold text-white"
          >
            {history.account.name}
          </Text>
          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[1px] text-blue-100">
            Current balance
          </Text>
          <Text className="mt-1 text-[27px] font-extrabold text-white">
            {history.summary.balance < 0 ? "−" : ""}₹
            {formatAmount(history.summary.balance)}
          </Text>
          <View className="mt-4 flex-row border-t border-white/15 pt-3">
            <View className="flex-1 border-r border-white/15">
              <Text className="text-[10px] text-blue-100">Money in</Text>
              <Text className="mt-1 text-[14px] font-extrabold text-white">
                ₹{formatAmount(history.summary.totalIn)}
              </Text>
            </View>
            <View className="flex-1 pl-4">
              <Text className="text-[10px] text-blue-100">Money out</Text>
              <Text className="mt-1 text-[14px] font-extrabold text-white">
                ₹{formatAmount(history.summary.totalOut)}
              </Text>
            </View>
          </View>
        </View>
        <Text className="mb-3 mt-4 px-1 text-[15px] font-extrabold text-slate-900">
          Transactions
        </Text>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 0,
          paddingBottom: insets.bottom + 32,
          flexGrow: transactions.length === 0 ? 1 : undefined,
        }}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refetch()}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage)
            void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14">
            <FileText color="#64748b" size={26} />
            <Text className="mt-4 text-[15px] font-extrabold text-slate-800">
              No transactions found
            </Text>
            <Text className="mt-1 text-center text-[12px] text-slate-500">
              Try changing the filters for {history.account.name}.
            </Text>
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="items-center py-5">
              <ActivityIndicator color="#134074" />
            </View>
          ) : null
        }
        renderItem={({ item }) => <TransactionRow transaction={item} />}
      />
      <FilterSheet
        visible={filtersVisible}
        value={filters}
        onApply={setFilters}
        onClose={() => setFiltersVisible(false)}
      />
    </View>
  );
}
