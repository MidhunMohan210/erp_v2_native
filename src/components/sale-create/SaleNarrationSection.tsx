import { Pressable, Text, TextInput, View } from "react-native";
import { FileText, X } from "lucide-react-native";

type SaleNarrationSectionProps = {
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
};

export function SaleNarrationSection({
  value,
  onChangeText,
  disabled = false,
}: SaleNarrationSectionProps) {
  return (
    <View className="rounded-[22px] border border-slate-200 bg-white p-5">
      <View className="mb-4 flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-50">
          <FileText color="#134074" size={21} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-extrabold text-slate-900">
            Narration
          </Text>
          <Text className="mt-1 text-[12px] text-slate-500">
            Add optional notes for this sale.
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
        className={`min-h-[96px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 ${
          disabled ? "bg-slate-100 text-slate-400" : ""
        }`}
      />
    </View>
  );
}
