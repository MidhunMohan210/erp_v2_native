import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type VoucherSubmitFooterProps = {
  actionLabel: string;
  pendingLabel: string;
  summaryLabel: string;
  summaryValue: string;
  isSubmitting: boolean;
  disabled: boolean;
  error: string;
  onPress: () => void;
};

export function VoucherSubmitFooter({
  actionLabel,
  pendingLabel,
  summaryLabel,
  summaryValue,
  isSubmitting,
  disabled,
  error,
  onPress,
}: VoucherSubmitFooterProps) {
  const insets = useSafeAreaInsets();
  const isDisabled = disabled || isSubmitting;

  return (
    <View
      className="border-t border-slate-200 bg-white px-4 pt-2.5"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      <View className="my-2 mb-3 flex-row items-center justify-between mx-4">
        <Text className="text-[15px] font-semibold text-slate-600">
          {summaryLabel}
        </Text>
        <Text className="text-[15px] font-extrabold text-[#134074]">
          {summaryValue}
        </Text>
      </View>

      {error ? (
        <Text className="mb-2 text-center text-[11px] leading-4 text-rose-700">
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onPress}
        className={`min-h-14 flex-row items-center justify-center rounded-2xl px-5 py-4 mx-2 ${
          isDisabled ? "bg-[#134074] opacity-50" : "bg-[#134074]"
        }`}
      >
        {isSubmitting ? <ActivityIndicator color="#64748b" size="small" /> : null}
        <Text
          className={`text-center text-[14px] font-bold ${
            isDisabled ? "ml-2 text-slate-500" : "text-white"
          }`}
        >
          {isSubmitting ? pendingLabel : actionLabel}
        </Text>

        {!isSubmitting && !disabled ? (
          <ArrowRight color="#ffffff" size={18} style={{ marginLeft: 8 }} />
        ) : null}
      </Pressable>
    </View>
  );
}
