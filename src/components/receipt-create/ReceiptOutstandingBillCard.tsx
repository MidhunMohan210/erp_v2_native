import { Pressable, Text, View } from "react-native";
import { Check, ReceiptText } from "lucide-react-native";

import type { ReceiptAllocatedBill } from "@/types/receipt";

type ReceiptOutstandingBillCardProps = {
  item: ReceiptAllocatedBill;
  disabled?: boolean;
  onToggle: (billId: string) => void;
};

function formatMoney(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatBillDate(value?: string): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ReceiptOutstandingBillCard({
  item,
  disabled = false,
  onToggle,
}: ReceiptOutstandingBillCardProps) {
  const pendingAmount = Number(item.bill.bill_pending_amt) || 0;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.selected, disabled }}
      disabled={disabled}
      onPress={() => onToggle(item.bill._id)}
      className={`mb-2.5 rounded-3xl border p-3.5 ${
        item.selected
          ? "border-[#134074] bg-blue-50"
          : "border-slate-200 bg-white"
      } ${disabled ? "opacity-55" : ""}`}
    >
      <View className="flex-row items-start">
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${
            item.selected ? "bg-[#134074]" : "bg-slate-100"
          }`}
        >
          {item.selected ? (
            <Check color="#ffffff" size={20} strokeWidth={3} />
          ) : (
            <ReceiptText color="#64748b" size={20} strokeWidth={2.2} />
          )}
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[14px] font-extrabold text-slate-900">
                {item.bill.bill_no || "Outstanding bill"}
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-500">
                {formatBillDate(item.bill.bill_date)}
              </Text>
            </View>
            <Text
              className={`text-[11px] font-bold ${
                item.selected ? "text-[#134074]" : "text-slate-500"
              }`}
            >
              {item.selected ? "Selected" : "Not selected"}
            </Text>
          </View>

          <View className="mt-3 flex-row rounded-2xl bg-white/80 px-3 py-2.5">
            <View className="flex-1">
              <Text className="text-[10px] font-medium uppercase text-slate-400">
                Pending
              </Text>
              <Text className="mt-1 text-[12px] font-bold text-slate-800">
                {formatMoney(pendingAmount)}
              </Text>
            </View>
            <View className="flex-1 border-l border-slate-100 pl-3">
              <Text className="text-[10px] font-medium uppercase text-slate-400">
                Settled
              </Text>
              <Text className="mt-1 text-[12px] font-bold text-emerald-700">
                {formatMoney(item.settledAmount)}
              </Text>
            </View>
            <View className="flex-1 border-l border-slate-100 pl-3">
              <Text className="text-[10px] font-medium uppercase text-slate-400">
                Balance
              </Text>
              <Text className="mt-1 text-[12px] font-bold text-slate-800">
                {formatMoney(item.remainingAmount)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
