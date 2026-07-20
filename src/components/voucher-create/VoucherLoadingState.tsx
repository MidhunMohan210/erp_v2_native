import { ActivityIndicator, Text, View } from "react-native";

type VoucherLoadingStateProps = {
  message: string;
};

/** Displays a compact loading state inside a voucher-creation section. */
export function VoucherLoadingState({ message }: VoucherLoadingStateProps) {
  return (
    <View className="flex-row items-center rounded-2xl bg-slate-50 px-4 py-5">
      <ActivityIndicator color="#134074" />
      <Text className="ml-3 text-[13px] text-slate-600">{message}</Text>
    </View>
  );
}
