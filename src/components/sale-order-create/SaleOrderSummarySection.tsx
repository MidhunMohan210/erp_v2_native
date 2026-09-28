import { Text, View } from "react-native";

import type {
  SaleOrderAdditionalChargeTotals,
  SaleOrderItemTotals,
} from "@/types/saleOrder";

type SaleOrderSummarySectionProps = {
  itemTotals: SaleOrderItemTotals;
  additionalChargeTotals: SaleOrderAdditionalChargeTotals;
};

type SummaryRowProps = {
  label: string;
  value: number;
};

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function SummaryRow({
  label,
  value,
}: SummaryRowProps) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-[12px] text-slate-500">{label}</Text>
      <Text className="ml-4 text-right text-[12px] font-semibold text-slate-700">{formatMoney(value)}</Text>
    </View>
  );
}

export function SaleOrderSummarySection({
  itemTotals,
  additionalChargeTotals,
}: SaleOrderSummarySectionProps) {

  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <Text className="text-[16px] font-bold text-slate-900">Summary</Text>
      <Text className="mt-0.5 text-[11px] text-slate-500">Review the order before saving</Text>

      <View className="mt-4 border-b border-slate-100 pb-3">
        <SummaryRow label="Sub total" value={itemTotals.subTotal} />
        <SummaryRow
          label="Discount"
          value={itemTotals.totalDiscount}
        />
        <SummaryRow
          label="Taxable amount"
          value={itemTotals.taxableAmount}
        />
        <SummaryRow
          label="Tax amount"
          value={itemTotals.totalTaxAmount}
        />
        <SummaryRow
          label="Additional charges"
          value={additionalChargeTotals.totalAdditionalCharge}
        />
      </View>

      <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-[#EAF2F8] px-4 py-4">
        <Text className="pr-2 text-[12px] font-bold text-[#134074]">Final amount</Text>
        <Text className="shrink text-right text-[22px] font-extrabold text-[#134074]">
          {formatMoney(additionalChargeTotals.finalAmount)}
        </Text>
      </View>

    </View>
  );
}
