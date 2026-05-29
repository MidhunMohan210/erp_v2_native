import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type PageErrorProps = {
  description: string;
  onRetry: () => void;
  title: string;
};

export function PageError({ description, onRetry, title }: PageErrorProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-rose-50">
        <Feather name="wifi-off" size={24} color="#f43f5e" />
      </View>
      <Text className="mb-2 text-[16px] font-bold text-slate-800">{title}</Text>
      <Text className="mb-6 text-center text-[14px] leading-5 text-slate-400">
        {description}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="rounded-2xl bg-[#134074] px-6 py-3"
      >
        <Text className="text-[14px] font-semibold text-white">Try Again</Text>
      </Pressable>
    </View>
  );
}
