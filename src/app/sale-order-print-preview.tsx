import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import type { SaleOrderPrintFormat } from "@/types/saleOrderPrint";

function getFormatLabel(format?: SaleOrderPrintFormat): string {
  if (format === "a4") return "A4 Document";
  if (format === "thermal80") return "80 mm Thermal";
  if (format === "thermal58") return "58 mm Thermal";
  return "No format selected";
}

export default function SaleOrderPrintPreviewScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    format?: SaleOrderPrintFormat;
  }>();

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Print Preview" />

      <View className="flex-1 px-4 pt-4">
        <View className="rounded-2xl border border-slate-200 bg-white p-5">
          <Text className="text-[12px] font-bold uppercase tracking-[1px] text-slate-400">
            Selected format
          </Text>
          <Text className="mt-2 text-[18px] font-extrabold text-[#134074]">
            {getFormatLabel(params.format)}
          </Text>
          <Text className="mt-3 text-[12px] leading-5 text-slate-500">
            The document preview will be added in the next phase.
          </Text>
        </View>
      </View>
    </View>
  );
}
