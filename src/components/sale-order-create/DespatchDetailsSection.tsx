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
    <View className="rounded-[22px] border border-slate-200 bg-white p-5">
      <View className="mb-4 flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-amber-50">
          <Truck color="#d97706" size={21} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-extrabold text-slate-900">
            Despatch details
          </Text>
          <Text className="mt-1 text-[12px] text-slate-500">
            Add optional despatch and reference information.
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit despatch details"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        className={`flex-row items-center rounded-2xl border px-4 py-4 ${
          disabled
            ? "border-slate-200 bg-slate-100 opacity-60"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <Text className="flex-1 text-[13px] font-bold text-slate-800">
          {hasDetails ? "Edit despatch details" : "+ Add despatch details"}
        </Text>
        <ChevronRight color="#d97706" size={19} strokeWidth={2.2} />
      </Pressable>

      {preview.length > 0 ? (
        <View className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          {preview.slice(0, 2).map((item) => (
            <Text
              key={item}
              numberOfLines={1}
              className="text-[12px] leading-5 text-slate-600"
            >
              {item}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
