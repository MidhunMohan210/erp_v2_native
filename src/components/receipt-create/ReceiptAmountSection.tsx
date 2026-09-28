import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { BadgeIndianRupee } from "lucide-react-native";

import { getNextReceiptAmountInput } from "@/utils/receipt";

type ReceiptAmountSectionProps = {
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
};

export function ReceiptAmountSection({
  value,
  onChangeText,
  disabled = false,
}: ReceiptAmountSectionProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = (nextValue: string) => {
    onChangeText(getNextReceiptAmountInput(value, nextValue));
  };

  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <View className="mb-4 flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
          <BadgeIndianRupee color="#047857" size={20} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[14px] font-bold text-slate-900">
            Receipt amount <Text className="text-rose-500">*</Text>
          </Text>
          <Text className="mt-0.5 text-[11px] text-slate-500">
            Enter the full amount received from the customer.
          </Text>
        </View>
      </View>

      <View
        className={`min-h-16 flex-row items-center rounded-2xl border px-4 ${
          disabled
            ? "border-slate-200 bg-slate-100 opacity-60"
            : isFocused
              ? "border-[#134074] bg-blue-50"
              : "border-slate-200 bg-slate-50"
        }`}
      >
        <Text className="mr-3 text-[24px] font-extrabold text-[#134074]">
          ₹
        </Text>
        <TextInput
          accessibilityLabel="Receipt amount"
          value={value}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          keyboardType="decimal-pad"
          maxLength={15}
          placeholder="0.00"
          placeholderTextColor="#94a3b8"
          className="flex-1 py-3 text-[24px] font-extrabold text-slate-900"
        />
      </View>
      <Text className="mt-2 text-[11px] text-slate-500">
        Up to two decimal places
      </Text>
    </View>
  );
}
