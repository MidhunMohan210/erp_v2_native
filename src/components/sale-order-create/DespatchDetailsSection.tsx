import { Pressable, Text, View } from "react-native";
import { ChevronRight, Truck } from "lucide-react-native";

import type { SaleOrderDespatchDetails } from "@/types/saleOrder";

type DespatchDetailsSectionProps = {
  details: SaleOrderDespatchDetails;
  onPress: () => void;
  disabled?: boolean;
};

export function DespatchDetailsSection({
  details,
  onPress,
  disabled = false,
}: DespatchDetailsSectionProps) {
  const preview = [
    details.challanNo ? `Challan: ${details.challanNo}` : "",
    details.despatchThrough ? `Via ${details.despatchThrough}` : "",
    details.vehicleNo ? `Vehicle: ${details.vehicleNo}` : "",
    details.destination ? `Destination: ${details.destination}` : "",
    details.orderNo ? `Order: ${details.orderNo}` : "",
  ].filter(Boolean);
  const hasDetails = Object.values(details).some((value) => value.trim());

  return (
    <View className="rounded-3xl bg-white px-5 py-4 shadow-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit despatch details" 
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        className={`min-h-12 flex-row items-center ${disabled ? "opacity-50" : ""}`}
      >
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
          <Truck color="#134074" size={19} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[14px] font-bold text-slate-800">Despatch details</Text>
          <Text className="mt-0.5 text-[11px] text-slate-500">
            {hasDetails ? "Details added" : "Optional · Add transport and references"}
          </Text>
        </View>
        <ChevronRight color="#94a3b8" size={19} strokeWidth={2.2} />
      </Pressable>

      {preview.length > 0 ? (
        <View className="ml-[52px] mt-2">
          {preview.slice(0, 2).map((item) => (
            <Text
              key={item}
              numberOfLines={1}
              className="text-[11px] leading-5 text-slate-600"
            >
              {item}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
