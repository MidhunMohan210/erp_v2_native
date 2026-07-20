import { Pressable, Text, View } from "react-native";
import { ChevronRight, Minus, Package2, Pencil, Plus } from "lucide-react-native";

import type { SaleOrderItem, SaleOrderItemTotals } from "@/types/saleOrder";

type SaleOrderItemsSectionProps = {
  items: SaleOrderItem[];
  totals: SaleOrderItemTotals;
  disabled?: boolean;
  onAddPress: () => void;
  onEdit: (item: SaleOrderItem) => void;
  onIncrement: (item: SaleOrderItem) => void;
  onDecrement: (item: SaleOrderItem) => void;
};

function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function SaleOrderItemsSection({
  items,
  totals,
  disabled = false,
  onAddPress,
  onEdit,
  onIncrement,
  onDecrement,
}: SaleOrderItemsSectionProps) {
  return (
    <View className="rounded-[22px] border border-slate-200 bg-white p-5">
      <View className="mb-4 flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-teal-50">
          <Package2 color="#0f766e" size={21} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-extrabold text-slate-900">
            Items <Text className="text-rose-500">*</Text>
          </Text>
          <Text className="mt-1 text-[12px] text-slate-500">
            Add products, quantities, rates and discounts.
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add products"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onAddPress}
        className={`flex-row items-center rounded-2xl px-4 py-4 ${
          disabled ? "bg-slate-300" : "bg-teal-700"
        }`}
      >
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/15">
          <Package2 color="#ffffff" size={18} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[14px] font-extrabold text-white">
            Add products
          </Text>
          <Text className="mt-1 text-[11px] text-white/70">
            {disabled
              ? "Select a customer first"
              : "Build the order line by line"}
          </Text>
        </View>
        <ChevronRight color="#ffffff" size={19} strokeWidth={2.2} />
      </Pressable>

      {items.length === 0 ? (
        <View className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
          <Text className="text-center text-[13px] text-slate-500">
            No items added yet.
          </Text>
        </View>
      ) : (
        <View className="mt-4">
          {items.map((item) => (
            <View
              key={item.id}
              className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <View className="flex-row items-start">
                <View className="flex-1 pr-3">
                  <Text numberOfLines={1} className="text-[14px] font-extrabold text-slate-900">
                    {item.name}
                  </Text>
                  <Text className="mt-1 text-[11px] text-slate-500">
                    Rate {formatMoney(item.rate)} · Tax {formatMoney(item.taxRate)}%
                  </Text>
                  <Text className="mt-1 text-[11px] text-slate-500">
                    Pricing: {item.initialPriceSource}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[14px] font-extrabold text-slate-900">
                    {formatMoney(item.totalAmount)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.name}`}
                    onPress={() => onEdit(item)}
                    className="mt-2 flex-row items-center rounded-full border border-teal-200 bg-white px-3 py-1.5"
                  >
                    <Pencil color="#0f766e" size={13} strokeWidth={2.2} />
                    <Text className="ml-1 text-[11px] font-bold text-teal-700">
                      Edit
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View className="mt-3 flex-row items-center border-t border-slate-200 pt-3">
                <Text className="mr-3 text-[12px] font-bold text-slate-600">
                  Quantity
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease ${item.name} quantity`}
                  onPress={() => onDecrement(item)}
                  className="h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50"
                >
                  <Minus color="#e11d48" size={15} strokeWidth={2.4} />
                </Pressable>
                <Text className="min-w-12 text-center text-[14px] font-extrabold text-slate-900">
                  {item.billedQty}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Increase ${item.name} quantity`}
                  onPress={() => onIncrement(item)}
                  className="h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50"
                >
                  <Plus color="#059669" size={15} strokeWidth={2.4} />
                </Pressable>
                <Text className="ml-auto text-[11px] text-slate-500">
                  {item.unit || "unit"}
                </Text>
              </View>
            </View>
          ))}

          <View className="rounded-2xl bg-teal-50 px-4 py-3">
            <View className="flex-row justify-between">
              <Text className="text-[12px] font-bold text-teal-800">
                {items.length} item{items.length === 1 ? "" : "s"}
              </Text>
              <Text className="text-[14px] font-extrabold text-teal-900">
                {formatMoney(totals.itemTotal)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
