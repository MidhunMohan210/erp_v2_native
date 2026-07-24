import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { AlertCircle, ReceiptText } from "lucide-react-native";

import type {
  SaleOrderAdditionalChargeTotals,
  SaleOrderItemTotals,
} from "@/types/saleOrder";

type SaleOrderSummarySectionProps = {
  itemTotals: SaleOrderItemTotals;
  additionalChargeTotals: SaleOrderAdditionalChargeTotals;
  isCreating: boolean;
  createError: string;
  disabled: boolean;
  onCreate: () => void;
};

type SummaryRowProps = {
  label: string;
  value: number;
  emphasized?: boolean;
};

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: SummaryRowProps) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text
        className={`text-[12px] ${
          emphasized
            ? "font-extrabold text-slate-800"
            : "text-slate-500"
        }`}
      >
        {label}
      </Text>
      <Text
        className={`ml-4 text-right text-[12px] ${
          emphasized
            ? "font-extrabold text-slate-900"
            : "font-semibold text-slate-700"
        }`}
      >
        {formatMoney(value)}
      </Text>
    </View>
  );
}

export function SaleOrderSummarySection({
  itemTotals,
  additionalChargeTotals,
  isCreating,
  createError,
  disabled,
  onCreate,
}: SaleOrderSummarySectionProps) {
  return (
    <View className="rounded-[22px] border border-slate-200 bg-white p-5">
      <View className="mb-4 flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-50">
          <ReceiptText color="#0284c7" size={21} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-extrabold text-slate-900">
            Summary
          </Text>
          <Text className="mt-1 text-[12px] text-slate-500">
            Review totals before saving the sale order.
          </Text>
        </View>
      </View>

      <View className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
        <View className="mb-3 flex-row items-center justify-between border-b border-sky-100 pb-3">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Order review
          </Text>
          <View className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Text className="text-[15px] font-extrabold text-slate-900">
              {formatMoney(additionalChargeTotals.finalAmount)}
            </Text>
          </View>
        </View>

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
        <View className="mt-1 border-t border-sky-100 pt-1">
          <SummaryRow
            label="Final amount"
            value={additionalChargeTotals.finalAmount}
            emphasized
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create sale order"
        accessibilityState={{ disabled: disabled || isCreating }}
        disabled={disabled || isCreating}
        onPress={onCreate}
        className={`mt-4 flex-row items-center justify-center rounded-2xl px-5 py-4 ${
          disabled || isCreating ? "bg-slate-300" : "bg-sky-600"
        }`}
      >
        {isCreating ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : null}
        <Text className="ml-2 text-[14px] font-extrabold text-white">
          {isCreating ? "Creating..." : "Create sale order"}
        </Text>
      </Pressable>

      {createError ? (
        <View className="mt-3 flex-row items-start rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle
            color="#e11d48"
            size={17}
            strokeWidth={2.2}
          />
          <Text className="ml-2 flex-1 text-[12px] leading-5 text-rose-700">
            {createError}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
