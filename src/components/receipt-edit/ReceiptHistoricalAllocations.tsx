import { Pressable, Text, View } from "react-native";
import { History, ReceiptText } from "lucide-react-native";

import type { ReceiptSettlementDetail } from "@/types/receipt";
import { sortReceiptSettlementsFifo } from "@/utils/receipt";

type ReceiptHistoricalAllocationsProps = {
  settlements: ReceiptSettlementDetail[];
  onChangeAllocation?: () => void;
  actionLabel?: string;
};

function formatMoney(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ReceiptHistoricalAllocationHeader() {
  return (
    <View className="flex-row items-center">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
        <History color="#134074" size={20} strokeWidth={2.2} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[14px] font-extrabold text-slate-900">
          Allocated Bills
        </Text>
        <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
          Saved values from this Receipt, not today&apos;s balances.
        </Text>
      </View>
    </View>
  );
}

type ReceiptHistoricalAllocationCardProps = {
  settlement: ReceiptSettlementDetail;
};

export function ReceiptHistoricalAllocationCard({
  settlement,
}: ReceiptHistoricalAllocationCardProps) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <View className="flex-row items-start">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
          <ReceiptText color="#475569" size={18} strokeWidth={2.1} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[13px] font-extrabold text-slate-900">
            {settlement.outstanding_number || "Outstanding bill"}
          </Text>
          <Text className="mt-0.5 text-[11px] text-slate-500">
            {formatDate(settlement.outstanding_date)}
          </Text>
        </View>
      </View>

      <View className="mt-3 border-t border-slate-200 pt-2">
        <View className="flex-row justify-between py-1">
          <Text className="text-[11px] text-slate-500">Original Amount</Text>
          <Text className="text-[12px] font-bold text-slate-800">
            {formatMoney(settlement.previous_outstanding_amount)}
          </Text>
        </View>
        <View className="flex-row justify-between py-1">
          <Text className="text-[11px] text-slate-500">
            Settled by this Receipt
          </Text>
          <Text className="text-[12px] font-bold text-emerald-700">
            {formatMoney(settlement.settled_amount)}
          </Text>
        </View>
        <View className="flex-row justify-between py-1">
          <Text className="text-[11px] text-slate-500">
            Balance After Receipt
          </Text>
          <Text className="text-[12px] font-bold text-[#134074]">
            {formatMoney(settlement.remaining_outstanding_amount)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ReceiptHistoricalAllocations({
  settlements,
  onChangeAllocation,
  actionLabel = "Change Allocation",
}: ReceiptHistoricalAllocationsProps) {
  const fifoSettlements = sortReceiptSettlementsFifo(settlements);

  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <ReceiptHistoricalAllocationHeader />

      {fifoSettlements.length ? (
        <View className="mt-4 gap-3">
          {fifoSettlements.map((item) => (
            <ReceiptHistoricalAllocationCard
              key={item._id || item.outstanding}
              settlement={item}
            />
          ))}
        </View>
      ) : (
        <Text className="mt-4 text-[12px] leading-5 text-slate-500">
          This Receipt did not allocate an Outstanding bill.
        </Text>
      )}

      {onChangeAllocation ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change Receipt allocation"
          onPress={onChangeAllocation}
          className="mt-4 items-center rounded-2xl border border-[#134074] bg-blue-50 px-4 py-3.5"
        >
          <Text className="text-[13px] font-extrabold text-[#134074]">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
