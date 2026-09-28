import { Text, View } from "react-native";

import type {
  SaleOrderAdditionalChargeTotals,
  SaleOrderItemTotals,
} from "@/types/saleOrder";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-[12px] text-slate-500">{label}</Text>
      <Text className="text-[12px] font-semibold text-slate-700">{value}</Text>
    </View>
  );
}

type SaleSummarySectionProps = {
  totals: SaleOrderItemTotals;
  additionalChargeTotals: SaleOrderAdditionalChargeTotals;
};

export function SaleSummarySection({
  totals,
  additionalChargeTotals,
}: SaleSummarySectionProps) {
  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <Text className="text-[16px] font-bold text-slate-900">Summary</Text>
      <Text className="mt-0.5 text-[11px] text-slate-500">Review the sale before saving</Text>
      <View className="mt-4 border-b border-slate-100 pb-3">
        <SummaryRow label="Subtotal" value={totals.subTotal.toFixed(2)} />
        <SummaryRow label="Discount" value={totals.totalDiscount.toFixed(2)} />
        <SummaryRow label="Tax" value={totals.totalTaxAmount.toFixed(2)} />
        <SummaryRow label="Item total" value={totals.itemTotal.toFixed(2)} />
        <SummaryRow
          label="Additional charges"
          value={additionalChargeTotals.totalAdditionalCharge.toFixed(2)}
        />
      </View>
      <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-[#EAF2F8] px-4 py-4">
        <Text className="pr-2 text-[12px] font-bold text-[#134074]">Final amount</Text>
        <Text className="shrink text-right text-[22px] font-extrabold text-[#134074]">
          {additionalChargeTotals.finalAmount.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}
