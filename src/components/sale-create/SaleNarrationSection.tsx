import { Pressable, Text, TextInput, View } from "react-native";
import { FileText, X } from "lucide-react-native";

type SaleNarrationSectionProps = {
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
};

export function SaleNarrationSection({
  value,
  onChangeText,
  onFocus,
  disabled = false,
}: SaleNarrationSectionProps) {
  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <View className="mb-3 flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-pink-50">
          <FileText color="#be185d" size={18} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[14px] font-bold text-slate-800">Narration</Text>
          <Text className="mt-0.5 text-[11px] text-slate-500">Optional note</Text>
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
        onFocus={onFocus}
        placeholder="Add narration"
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        editable={!disabled}
        className={`min-h-[64px] rounded-2xl bg-slate-50 px-4 py-3 text-[14px] text-slate-900 ${
          disabled ? "bg-slate-100 text-slate-400" : ""
        }`}
      />
    </View>
  );
}
