import { Text, View } from "react-native";

type VoucherEmptyStateProps = {
  message: string;
};

/** Displays a non-error message when required voucher data is unavailable. */
export function VoucherEmptyState({ message }: VoucherEmptyStateProps) {
  return (
    <View className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
      <Text className="text-[13px] leading-5 text-amber-800">{message}</Text>
    </View>
  );
}
