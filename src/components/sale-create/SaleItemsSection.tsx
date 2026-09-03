import { PackagePlus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

type SaleItemsSectionProps = {
  disabled: boolean;
};

export function SaleItemsSection({ disabled }: SaleItemsSectionProps) {
  return (
    <View className="rounded-[22px] border border-slate-200 bg-white p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-[16px] font-extrabold text-slate-900">
            Items
          </Text>
          <Text className="mt-1 text-[12px] text-slate-500">
            No products added
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add product"
          accessibilityState={{ disabled }}
          disabled={disabled}
          className={`h-10 w-10 items-center justify-center rounded-xl ${
            disabled ? "bg-slate-100" : "bg-[#134074]"
          }`}
        >
          <PackagePlus color={disabled ? "#94a3b8" : "#ffffff"} size={20} />
        </Pressable>
      </View>
    </View>
  );
}
