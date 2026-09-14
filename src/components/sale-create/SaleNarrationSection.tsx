import { Pressable, Text, TextInput, View } from "react-native";
import { FileText, X } from "lucide-react-native";

type SaleNarrationSectionProps = {
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function SaleNarrationSection({
  value,
  onChangeText,
  disabled = false,
  compact = false,
}: SaleNarrationSectionProps) {
  return (
    <View
      className={
        compact
          ? "bg-white px-4 pb-4 pt-4"
          : "rounded-[22px] border border-slate-200 bg-white p-5"
      }
    >
      <View className={`${compact ? "mb-3" : "mb-4"} flex-row items-center`}>
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF2F8]">
          <FileText color="#134074" size={20} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text
            className={`${compact ? "text-[14px]" : "text-[16px]"} font-extrabold text-slate-900`}
          >
            Narration
          </Text>
          <Text className="mt-1 text-[11px] text-slate-500">
            Optional note for this sale
          </Text>
        </View>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear narration"
            disabled={disabled}
            onPress={() => onChangeText("")}
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
          >
            <X color="#475569" size={18} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      <TextInput
        accessibilityLabel="Narration"
        value={value}
        onChangeText={onChangeText}
        placeholder="Add narration"
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        editable={!disabled}
        className={`${compact ? "min-h-[76px]" : "min-h-[96px]"} rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900 ${
          disabled ? "bg-slate-100 text-slate-400" : ""
        }`}
      />
    </View>
  );
}
