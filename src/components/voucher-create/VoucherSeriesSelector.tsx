import { Pressable, Text, View } from "react-native";
import { ChevronDown, Hash } from "lucide-react-native";

import { formatVoucherSeriesNumber } from "@/services/voucherSeries.service";
import type { VoucherSeriesItem } from "@/types/voucher";

type VoucherSeriesSelectorProps = {
  selectedSeries: VoucherSeriesItem;
  onPress: () => void;
  disabled?: boolean;
  displayNumber?: string;
};

/**
 * Shows the selected series and its next-number preview.
 * The backend still decides the final number when the voucher is submitted.
 */
export function VoucherSeriesSelector({
  selectedSeries,
  onPress,
  disabled = false,
  displayNumber,
}: VoucherSeriesSelectorProps) {
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select voucher series"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        className={`min-h-14 flex-row items-center py-3 ${disabled ? "opacity-60" : ""}`}
      >
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
          <Hash color="#4f46e5" size={18} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[11px] font-medium text-slate-500">Voucher series</Text>
          <Text className="mt-0.5 text-[14px] font-bold text-slate-900" numberOfLines={1}>
            {selectedSeries.seriesName}
          </Text>
          <Text className="mt-0.5 text-[11px] text-slate-500">
            No. {displayNumber || formatVoucherSeriesNumber(selectedSeries)}
          </Text>
        </View>
        {!disabled ? (
          <ChevronDown color="#94a3b8" size={18} strokeWidth={2.2} />
        ) : null}
      </Pressable>
    </View>
  );
}
