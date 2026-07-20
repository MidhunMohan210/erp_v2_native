import { Pressable, Text, View } from "react-native";

type VoucherErrorStateProps = {
  message: string;
  onRetry: () => void;
};

/** Displays an API error without replacing the complete voucher screen. */
export function VoucherErrorState({
  message,
  onRetry,
}: VoucherErrorStateProps) {
  return (
    <View className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
      <Text className="text-[13px] leading-5 text-rose-700">{message}</Text>
      <Pressable onPress={onRetry} className="mt-3 self-start">
        <Text className="text-[13px] font-bold text-rose-700">Retry</Text>
      </Pressable>
    </View>
  );
}
