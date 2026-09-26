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
  label?: string;
  variant?: "default" | "voucher";
};

export function TransactionDateSelector({
  value,
  onChange,
  disabled = false,
  label = "Transaction date",
  variant = "default",
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
  const isVoucherVariant = variant === "voucher";

  return (
    <View>
      {!isVoucherVariant ? (
        <Text className="mb-2 text-[13px] font-bold text-slate-700">
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select ${label.toLowerCase()}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openPicker}
        className={
          isVoucherVariant
            ? `min-h-14 flex-row items-center py-3 ${disabled ? "opacity-50" : ""}`
            : `flex-row items-center rounded-2xl border px-4 py-4 ${
                disabled
                  ? "border-slate-200 bg-slate-100 opacity-60"
                  : "border-slate-300 bg-slate-50"
              }`
        }
      >
        <View className={`h-9 w-9 items-center justify-center rounded-xl ${isVoucherVariant ? "bg-teal-50" : "bg-white"}`}>
          <CalendarDays color={isVoucherVariant ? "#0f766e" : "#134074"} size={isVoucherVariant ? 18 : 19} strokeWidth={2.2} />
        </View>
        {isVoucherVariant ? (
          <View className="ml-3 flex-1">
            <Text className="text-[11px] font-medium text-slate-500">{label}</Text>
            <Text className="mt-0.5 text-[14px] font-bold text-slate-900">{displayDate}</Text>
          </View>
        ) : (
          <Text className="ml-3 flex-1 text-[14px] font-bold text-slate-900">{displayDate}</Text>
        )}
        <ChevronDown
          color={isVoucherVariant ? "#94a3b8" : "#64748b"}
          size={isVoucherVariant ? 18 : 20}
          strokeWidth={2.2}
        />
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
                Select {label.toLowerCase()}
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
