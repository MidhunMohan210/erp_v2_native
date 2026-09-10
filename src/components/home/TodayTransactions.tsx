import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { FileText } from "lucide-react-native";

import { useDaybookQuery } from "@/hooks/queries/voucherQueries";
import { useAppSelector } from "@/store/hooks";
import type { DaybookFilters, VoucherListItem, VoucherType } from "@/types/voucher";
import { getTodayDateString, getVoucherTypeLabel } from "@/utils/voucher";

function formatAmount(amount?: number): string {
  return Number(amount ?? 0).toFixed(2);
}

function getTransactionTypeLabel(voucherType: string): string {
  if (
    voucherType === "saleOrder" ||
    voucherType === "receipt" ||
    voucherType === "sale"
  ) {
    return getVoucherTypeLabel(voucherType as VoucherType);
  }

  return "Transaction";
}

type TransactionRowProps = {
  transaction: VoucherListItem;
  onPress: () => void;
};

function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const voucherTypeLabel = getTransactionTypeLabel(transaction.voucher_type);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${voucherTypeLabel} ${
        transaction.voucher_number || "details"
      }`}
      onPress={onPress}
      className="flex-row items-center rounded-2xl bg-white px-4 py-3.5"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2F8]">
        <Text className="text-[12px] font-extrabold text-[#134074]">
          {voucherTypeLabel.slice(0, 1)}
        </Text>
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <Text className="text-[13px] font-semibold text-slate-800" numberOfLines={1}>
          {transaction.party_name || voucherTypeLabel}
        </Text>
        <Text className="mt-0.5 text-[10px] text-slate-400" numberOfLines={1}>
          {transaction.voucher_number || "Voucher"} · {voucherTypeLabel}
        </Text>
      </View>

      <Text className="ml-3 text-[13px] font-bold text-slate-800">
        ₹{formatAmount(transaction.amount)}
      </Text>
    </Pressable>
  );
}

export function TodayTransactions() {
  const router = useRouter();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const today = getTodayDateString();
  const filters: DaybookFilters = {
    from: today,
    to: today,
    voucherTypes: [],
  };
  const transactionsQuery = useDaybookQuery(
    selectedCompany?._id ?? "",
    filters,
    Boolean(selectedCompany?._id),
  );
  const transactions =
    transactionsQuery.data?.pages.flatMap((page) => page.vouchers) ?? [];

  const openTransaction = (transaction: VoucherListItem) => {
    if (transaction.voucher_type === "saleOrder") {
      router.push({
        pathname: "/sale-order-detail",
        params: { id: transaction._id },
      });
      return;
    }

    if (transaction.voucher_type === "sale") {
      router.push({
        pathname: "/sale-detail",
        params: { id: transaction._id },
      });
      return;
    }

    if (transaction.voucher_type === "receipt") {
      router.push({
        pathname: "/receipt-detail",
        params: { id: transaction._id },
      });
    }
  };

  const handleLoadMore = () => {
    if (transactionsQuery.hasNextPage && !transactionsQuery.isFetchingNextPage) {
      transactionsQuery.fetchNextPage();
    }
  };

  return (
    <View className="mx-5 mt-6 flex-1" style={{ minHeight: 0 }}>
      <View className="flex-row items-center justify-between mx-3">
        <Text className="text-[16px] font-bold text-slate-700 ">
          Today&apos;s Transactions
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all transactions"
          onPress={() =>
            router.push({
              pathname: "/daybook",
              params: { dateRange: "today" },
            })
          }
        >
          <Text className="text-[12px] font-semibold text-[#134074]">View all</Text>
        </Pressable>
      </View>

      <ScrollView
        scrollEnabled
        showsVerticalScrollIndicator={false}
        className="mt-4 "
        style={{ flex: 1 }}
        contentContainerStyle={{
          gap: 12,
          paddingBottom: 130,
          flexGrow: transactions.length === 0 ? 1 : undefined,
        }}
        onMomentumScrollEnd={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const distanceFromBottom =
            contentSize.height - layoutMeasurement.height - contentOffset.y;

          if (distanceFromBottom < 40) {
            handleLoadMore();
          }
        }}
      >
        {transactionsQuery.isLoading ? (
          <View className="items-center py-5">
            <ActivityIndicator color="#134074" />
          </View>
        ) : transactions.length > 0 ? (
          transactions.map((transaction) => (
            <TransactionRow
              key={transaction._id}
              transaction={transaction}
              onPress={() => openTransaction(transaction)}
            />
          ))
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F8]">
              <FileText color="#134074" size={14} />
            </View>
            <Text className="mt-4 text-[14px] font-bold text-slate-700">
              No transactions today
            </Text>
            <Text className="mt-1 text-center text-[12px] text-slate-400">
              Transactions created today will appear here.
            </Text>
          </View>
        )}

        {transactionsQuery.isFetchingNextPage ? (
          <View className="items-center py-3">
            <ActivityIndicator color="#134074" />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
