import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { CalendarDays, ChevronDown } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatVoucherDate, parseVoucherDate } from "@/utils/voucher";

type TransactionDateSelectorProps = {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
};

export function TransactionDateSelector({
  value,
  onChange,
  disabled = false,
}: TransactionDateSelectorProps) {
  const insets = useSafeAreaInsets();
  const selectedDate = parseVoucherDate(value);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState(selectedDate);

  const openPicker = () => {
    setPendingDate(selectedDate);
    setIsPickerOpen(true);
  };

  const handlePickerChange = (
    event: DateTimePickerEvent,
    nextDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setIsPickerOpen(false);

      if (event.type === "set" && nextDate) {
        onChange(formatVoucherDate(nextDate));
      }
      return;
    }

    if (nextDate) {
      setPendingDate(nextDate);
    }
  };

  const confirmDate = () => {
    onChange(formatVoucherDate(pendingDate));
    setIsPickerOpen(false);
  };

  const displayDate = value
    ? selectedDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not available";

  return (
    <View>
      <Text className="mb-2 text-[13px] font-bold text-slate-700">
        Transaction date
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select transaction date"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openPicker}
        className={`flex-row items-center rounded-2xl border px-4 py-4 ${
          disabled
            ? "border-slate-200 bg-slate-100 opacity-60"
            : "border-slate-300 bg-slate-50"
        }`}
      >
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
          <CalendarDays color="#134074" size={19} strokeWidth={2.2} />
        </View>
        <Text className="ml-3 flex-1 text-[14px] font-bold text-slate-900">
          {displayDate}
        </Text>
        <ChevronDown color="#64748b" size={20} strokeWidth={2.2} />
      </Pressable>

      {Platform.OS === "android" && isPickerOpen ? (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={handlePickerChange}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={isPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsPickerOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/35">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close date selector"
              className="flex-1"
              onPress={() => setIsPickerOpen(false)}
            />
            <View
              className="rounded-t-[28px] bg-white px-5 pt-5"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              <Text className="text-[18px] font-extrabold text-slate-900">
                Select transaction date
              </Text>
              <DateTimePicker
                value={pendingDate}
                mode="date"
                display="spinner"
                onChange={handlePickerChange}
              />
              <View className="flex-row gap-3 border-t border-slate-100 pt-4">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsPickerOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3.5"
                >
                  <Text className="text-center text-[14px] font-bold text-slate-700">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmDate}
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
      ) : null}
    </View>
  );
}
