import { Pressable, Text, TextInput, View } from "react-native";
import { FileText, X } from "lucide-react-native";

type ReceiptNarrationSectionProps = {
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
};

export function ReceiptNarrationSection({
  value,
  onChangeText,
  onFocus,
  onBlur,
  disabled = false,
}: ReceiptNarrationSectionProps) {
  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <View className="mb-3 flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-pink-50">
          <FileText color="#be185d" size={18} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[14px] font-bold text-slate-900">Narration</Text>
          <Text className="mt-0.5 text-[11px] text-slate-500">
            Optional note for this Receipt
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
        accessibilityLabel="Receipt narration"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Add an optional note"
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        editable={!disabled}
        maxLength={500}
        className={`min-h-[72px] rounded-2xl bg-slate-50 px-4 py-3 text-[14px] text-slate-900 ${
          disabled ? "bg-slate-100 text-slate-400" : ""
        }`}
      />
    </View>
  );
}
