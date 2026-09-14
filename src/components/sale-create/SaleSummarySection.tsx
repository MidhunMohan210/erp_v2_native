import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AlertCircle } from "lucide-react-native";

import type {
  SaleOrderAdditionalChargeTotals,
  SaleOrderItemTotals,
} from "@/types/saleOrder";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-[13px] text-slate-600">{label}</Text>
      <Text className="text-[13px] font-bold text-slate-900">{value}</Text>
    </View>
  );
}

type SaleSummarySectionProps = {
  totals: SaleOrderItemTotals;
  additionalChargeTotals: SaleOrderAdditionalChargeTotals;
  isCreating: boolean;
  createError: string;
  disabled: boolean;
  onCreate: () => void;
  showCreateButton?: boolean;
};

export function SaleSummarySection({
  totals,
  additionalChargeTotals,
  isCreating,
  createError,
  disabled,
  onCreate,
  showCreateButton = true,
}: SaleSummarySectionProps) {
  return (
    <View className="rounded-[24px] border border-slate-200 bg-white p-4">
      <Text className="text-[16px] font-extrabold text-slate-900">
        Sale summary
      </Text>
      <Text className="mt-1 text-[11px] text-slate-500">
        Review the calculated values before creating the sale.
      </Text>
      <View className="mt-3 border-t border-slate-100 pt-1">
        <SummaryRow label="Subtotal" value={totals.subTotal.toFixed(2)} />
        <SummaryRow label="Discount" value={totals.totalDiscount.toFixed(2)} />
        <SummaryRow label="Tax" value={totals.totalTaxAmount.toFixed(2)} />
        <SummaryRow label="Item total" value={totals.itemTotal.toFixed(2)} />
        <SummaryRow
          label="Additional charges"
          value={additionalChargeTotals.totalAdditionalCharge.toFixed(2)}
        />
      </View>
      <View className="mt-2 flex-row items-center justify-between rounded-2xl bg-[#EAF2F8] px-4 py-3.5">
        <Text className="text-[13px] font-bold text-[#134074]">
          Final amount
        </Text>
        <Text className="text-[19px] font-extrabold text-[#134074]">
          ₹{additionalChargeTotals.finalAmount.toFixed(2)}
        </Text>
      </View>

      {showCreateButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create sale"
          accessibilityState={{ disabled: disabled || isCreating }}
          disabled={disabled || isCreating}
          onPress={onCreate}
          className={`mt-4 flex-row items-center justify-center rounded-2xl px-4 py-3.5 ${
            disabled || isCreating ? "bg-slate-200" : "bg-[#134074]"
          }`}
        >
          {isCreating ? <ActivityIndicator color="#ffffff" size="small" /> : null}
          <Text
            className={`text-center text-[14px] font-bold ${
              disabled || isCreating ? "ml-2 text-slate-500" : "text-white"
            }`}
          >
            {isCreating ? "Creating..." : "Create Sale"}
          </Text>
        </Pressable>
      ) : null}

      {createError ? (
        <View className="mt-3 flex-row items-start rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle color="#e11d48" size={17} strokeWidth={2.2} />
          <Text className="ml-2 flex-1 text-[12px] leading-5 text-rose-700">
            {createError}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
