import { Pressable, Text, View } from "react-native";
import {
  Banknote,
  Check,
  FileCheck2,
  Landmark,
  Smartphone,
} from "lucide-react-native";

import type { ReceiptInstrumentType } from "@/types/receipt";

type ReceiptInstrumentSectionProps = {
  value: ReceiptInstrumentType;
  onChange: (value: ReceiptInstrumentType) => void;
  disabled?: boolean;
};

type InstrumentOption = {
  value: ReceiptInstrumentType;
  label: string;
  description: string;
  icon: typeof Banknote;
};

const INSTRUMENT_OPTIONS: InstrumentOption[] = [
  {
    value: "cash",
    label: "Cash",
    description: "Cash account",
    icon: Banknote,
  },
  {
    value: "cheque",
    label: "Cheque",
    description: "Bank account",
    icon: FileCheck2,
  },
  {
    value: "upi",
    label: "UPI",
    description: "Bank account",
    icon: Smartphone,
  },
  {
    value: "neft",
    label: "NEFT",
    description: "Bank account",
    icon: Landmark,
  },
  {
    value: "rtgs",
    label: "RTGS",
    description: "Bank account",
    icon: Landmark,
  },
];

export function ReceiptInstrumentSection({
  value,
  onChange,
  disabled = false,
}: ReceiptInstrumentSectionProps) {
  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <Text className="text-[14px] font-bold text-slate-900">
        Payment method <Text className="text-rose-500">*</Text>
      </Text>
      <Text className="mt-1 text-[11px] leading-4 text-slate-500">
        The method determines whether the Receipt uses a Cash or Bank account.
      </Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {INSTRUMENT_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          const Icon = option.icon;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              className={`min-w-[30%] flex-1 rounded-2xl border px-3 py-3 ${
                isSelected
                  ? "border-[#134074] bg-blue-50"
                  : "border-slate-200 bg-white"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <View className="flex-row items-center justify-between">
                <Icon
                  color={isSelected ? "#134074" : "#64748b"}
                  size={18}
                  strokeWidth={2.2}
                />
                {isSelected ? (
                  <View className="h-5 w-5 items-center justify-center rounded-full bg-[#134074]">
                    <Check color="#ffffff" size={12} strokeWidth={3} />
                  </View>
                ) : null}
              </View>
              <Text
                className={`mt-2 text-[13px] font-bold ${
                  isSelected ? "text-[#134074]" : "text-slate-800"
                }`}
              >
                {option.label}
              </Text>
              <Text className="mt-0.5 text-[10px] text-slate-500">
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
