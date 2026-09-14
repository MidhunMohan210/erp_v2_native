import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SaleCreateBottomBarProps = {
  finalAmount: number;
  itemCount: number;
  disabled: boolean;
  isCreating: boolean;
  onCreate: () => void;
};

export function SaleCreateBottomBar({
  finalAmount,
  itemCount,
  disabled,
  isCreating,
  onCreate,
}: SaleCreateBottomBarProps) {
  const insets = useSafeAreaInsets();
  const isDisabled = disabled || isCreating;

  return (
    <View
      className="flex-row items-center border-t border-slate-200 bg-white px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className="mr-4 min-w-[112px]">
        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">
          Total
        </Text>
        <Text className="mt-0.5 text-[19px] font-extrabold text-slate-900">
          ₹{finalAmount.toFixed(2)}
        </Text>
        <Text className="mt-0.5 text-[10px] text-slate-500">
          {itemCount} product{itemCount === 1 ? "" : "s"}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create sale"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onCreate}
        className={`min-h-14 flex-1 flex-row items-center justify-center rounded-2xl px-4 ${
          disabled && !isCreating ? "bg-slate-200" : "bg-[#134074]"
        }`}
      >
        {isCreating ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <Text
              className={`text-[14px] font-extrabold ${
                isDisabled ? "text-slate-500" : "text-white"
              }`}
            >
              Create Sale
            </Text>
            <ArrowRight
              color={isDisabled ? "#64748b" : "#ffffff"}
              size={18}
              strokeWidth={2.4}
              style={{ marginLeft: 8 }}
            />
          </>
        )}
      </Pressable>
    </View>
  );
}
