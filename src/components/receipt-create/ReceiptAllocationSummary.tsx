import { Text, View } from "react-native";
import { CircleDollarSign } from "lucide-react-native";

type ReceiptAllocationSummaryProps = {
  receiptAmount: number;
  totalSettled: number;
  unallocatedAmount: number;
  advancePreview: number | null;
};

function formatMoney(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type SummaryRowProps = {
  label: string;
  value: string;
  strong?: boolean;
};

function SummaryRow({ label, value, strong = false }: SummaryRowProps) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-[12px] text-slate-500">{label}</Text>
      <Text
        className={`text-[13px] font-bold ${
          strong ? "text-[#134074]" : "text-slate-800"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

export function ReceiptAllocationSummary({
  receiptAmount,
  totalSettled,
  unallocatedAmount,
  advancePreview,
}: ReceiptAllocationSummaryProps) {
  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <View className="mb-3 flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
          <CircleDollarSign color="#047857" size={20} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[14px] font-extrabold text-slate-900">
            Settlement summary
          </Text>
          <Text className="mt-0.5 text-[11px] text-slate-500">
            The backend will verify every amount again.
          </Text>
        </View>
      </View>

      <View className="border-t border-slate-100 pt-2">
        <SummaryRow label="Receipt amount" value={formatMoney(receiptAmount)} />
        <SummaryRow label="Allocated amount" value={formatMoney(totalSettled)} />
        <SummaryRow
          label="Unallocated amount"
          value={formatMoney(unallocatedAmount)}
        />
        <SummaryRow
          label="Advance preview"
          value={
            advancePreview === null
              ? "Load remaining bills"
              : formatMoney(advancePreview)
          }
          strong
        />
      </View>
    </View>
  );
}
