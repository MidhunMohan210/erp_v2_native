import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatVoucherSeriesNumber } from "@/services/voucherSeries.service";
import type { VoucherSeriesItem } from "@/types/voucher";

type VoucherSeriesModalProps = {
  visible: boolean;
  voucherLabel: string;
  series: VoucherSeriesItem[];
  selectedSeries: VoucherSeriesItem;
  onClose: () => void;
  onConfirm: (series: VoucherSeriesItem) => void;
};

// These describe everything the parent screen must provide.
// visible: Whether the modal is open.
// voucherLabel: The voucher name, such as "Sale Order" or "Purchase".
// series: All available voucher series.
// selectedSeries: The currently confirmed series.
// onClose: Function for closing without changing the selection.
// onConfirm: Function that receives the newly confirmed series.

/**
 * Reusable series picker for voucher creation screens.
 * Selection stays temporary until the user presses Select, matching the web flow.
 */

// selectedSeries   → confirmed selection owned by the parent screen
// pendingSeriesId  → temporary selection inside the modal
  export function VoucherSeriesModal({
  visible,
  voucherLabel,
  series,
  selectedSeries,
  onClose,
  onConfirm,
}: VoucherSeriesModalProps) {
  const insets = useSafeAreaInsets();
  const [pendingSeriesId, setPendingSeriesId] = useState(selectedSeries._id);  //pendingSeriesId is the currently highlighted series inside the modal.

  // Reset an unconfirmed choice whenever the modal is opened again.
  useEffect(() => {
    if (visible) {
      setPendingSeriesId(selectedSeries._id);
    }
  }, [selectedSeries._id, visible]);

  const pendingSeries =
    series.find((item) => item._id === pendingSeriesId) ?? selectedSeries;

  const handleConfirm = () => {
    onConfirm(pendingSeries);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/35">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close voucher series selector"
          className="flex-1"
          onPress={onClose}
        />

        <View
          className="max-h-[72%] rounded-t-[28px] bg-white px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[18px] font-extrabold text-slate-900">
                Select series
              </Text>
              <Text className="mt-1 text-[13px] leading-5 text-slate-500">
                Choose which series to use for this {voucherLabel.toLowerCase()}.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X color="#475569" size={19} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
            <Text className="text-[12px] font-medium text-slate-500">
              Current number
            </Text>
            <Text className="mt-1 text-[17px] font-extrabold text-[#134074]">
              {formatVoucherSeriesNumber(pendingSeries)}
            </Text>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {series.map((item) => {
              const isSelected = item._id === pendingSeries._id;

              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  key={item._id}
                  onPress={() => setPendingSeriesId(item._id)}
                  className={`mb-3 flex-row items-center rounded-2xl border px-4 py-4 ${
                    isSelected
                      ? "border-[#134074] bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-slate-900">
                      {item.seriesName}
                    </Text>
                    <Text className="mt-1 text-[12px] text-slate-500">
                      Next: {formatVoucherSeriesNumber(item)}
                    </Text>
                  </View>
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full ${
                      isSelected ? "bg-[#134074]" : "border border-slate-300"
                    }`}
                  >
                    {isSelected ? (
                      <Check color="#ffffff" size={15} strokeWidth={3} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="mt-2 flex-row gap-3 border-t border-slate-100 pt-4">
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3.5"
            >
              <Text className="text-center text-[14px] font-bold text-slate-700">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleConfirm}
              className="flex-1 rounded-2xl bg-[#134074] px-4 py-3.5"
            >
              <Text className="text-center text-[14px] font-bold text-white">
                Select
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
