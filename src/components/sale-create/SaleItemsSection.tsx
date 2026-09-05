import { PackagePlus, Pencil, Trash2 } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { SaleItem } from "@/types/sale";
import type { SaleOrderItemTotals } from "@/types/saleOrder";

type SaleItemsSectionProps = {
  items: SaleItem[];
  totals: SaleOrderItemTotals;
  disabled: boolean;
  onAddPress: () => void;
  onEdit: (item: SaleItem) => void;
  onRemove: (itemId: string) => void;
};

export function SaleItemsSection({
  items,
  totals,
  disabled,
  onAddPress,
  onEdit,
  onRemove,
}: SaleItemsSectionProps) {
  return (
    <View className="rounded-[22px] border border-slate-200 bg-white p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-[16px] font-extrabold text-slate-900">
            Items
          </Text>
          <Text className="mt-1 text-[12px] text-slate-500">
            {items.length
              ? `${items.length} stock allocation${items.length === 1 ? "" : "s"}`
              : "No products added"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add product"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onAddPress}
          className={`h-10 w-10 items-center justify-center rounded-xl ${
            disabled ? "bg-slate-100" : "bg-[#134074]"
          }`}
        >
          <PackagePlus color={disabled ? "#94a3b8" : "#ffffff"} size={20} />
        </Pressable>
      </View>

      {items.map((item) => (
        <View
          key={item.id}
          className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
        >
          <View className="flex-row items-start">
            <View className="flex-1 pr-3">
              <Text numberOfLines={1} className="text-[14px] font-bold text-slate-900">
                {item.name}
              </Text>
              <Text className="mt-1 text-[11px] text-slate-500">
                {item.godownName || "Godown name unavailable"}
                {item.batch ? ` · Batch ${item.batch}` : ""}
              </Text>
              <Text className="mt-1 text-[11px] text-slate-500">
                Qty {item.actualQty} {item.baseUnit} · Rate {item.rate.toFixed(2)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[14px] font-extrabold text-slate-900">
                {item.totalAmount.toFixed(2)}
              </Text>
              <View className="mt-2 flex-row gap-2">
                <Pressable
                  accessibilityLabel={`Edit ${item.name}`}
                  onPress={() => onEdit(item)}
                  className="rounded-lg bg-white p-2"
                >
                  <Pencil color="#134074" size={15} />
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove ${item.name}`}
                  onPress={() => onRemove(item.id)}
                  className="rounded-lg bg-rose-50 p-2"
                >
                  <Trash2 color="#e11d48" size={15} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      ))}

      {items.length ? (
        <View className="mt-4 flex-row justify-between rounded-xl bg-[#EAF2F8] px-4 py-3">
          <Text className="text-[12px] font-bold text-[#134074]">Item total</Text>
          <Text className="text-[14px] font-extrabold text-[#134074]">
            {totals.itemTotal.toFixed(2)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
