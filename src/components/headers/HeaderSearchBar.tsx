import { Pressable, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";

interface HeaderSearchBarProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export function HeaderSearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: HeaderSearchBarProps) {
  return (
    <View className="h-12 flex-row items-center rounded-xl border border-[#d8dee9] bg-white px-[14px]">
      <Search color="#94a3b8" size={24} strokeWidth={2.1} />
      <TextInput
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        className="ml-[10px] flex-1 py-0 text-[15px] text-[#17203a]"
        value={value}
      />
      {value ? (
        <Pressable hitSlop={10} onPress={() => onChange("")} className="ml-2 p-0.5">
          <X color="#94a3b8" size={18} strokeWidth={2.1} />
        </Pressable>
      ) : null}
    </View>
  );
}
