import { Pressable, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";

import { formatVoucherSeriesNumber } from "@/services/voucherSeries.service";
import type { VoucherSeriesItem } from "@/types/voucher";

type VoucherSeriesSelectorProps = {
  selectedSeries: VoucherSeriesItem;
  onPress: () => void;
};

/**
 * Shows the selected series and its next-number preview.
 * The backend still decides the final number when the voucher is submitted.
 */
export function VoucherSeriesSelector({
  selectedSeries,
  onPress,
}: VoucherSeriesSelectorProps) {
  return (
    <View>
      <Text className="mb-2 text-[13px] font-bold text-slate-700">
        Voucher number
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select voucher series"
        onPress={onPress}
        className="flex-row items-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4"
      >
        <View className="flex-1">
          <Text className="text-[14px] font-bold text-slate-900">
            {selectedSeries.seriesName}
          </Text>
          <Text className="mt-1 text-[12px] text-slate-500">
            No: #{formatVoucherSeriesNumber(selectedSeries)}
          </Text>
        </View>
        <ChevronDown color="#64748b" size={20} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
