import { Modal, Pressable, Text, View } from "react-native";
import { RefreshCw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RepriceConfirmationSheetProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RepriceConfirmationSheet({
  visible,
  onCancel,
  onConfirm,
}: RepriceConfirmationSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View
          className="rounded-t-[28px] bg-white px-6 pt-6"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#EAF2F8]">
              <RefreshCw color="#004178" size={21} strokeWidth={2.3} />
            </View>
            <Text className="flex-1 text-[18px] font-extrabold text-slate-900">
              Re-price current items?
            </Text>
          </View>

          <Text className="mb-6 text-[15px] leading-6 text-slate-600">
            Changing the price level recalculates every item. Products without
            a matching rate will use 0.
          </Text>

          <View className="gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change price level and re-price items"
              onPress={onConfirm}
              className="items-center rounded-2xl bg-[#004178] px-4 py-4"
            >
              <Text className="text-[15px] font-bold text-white">
                Change prices
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keep current price level"
              onPress={onCancel}
              className="items-center rounded-2xl border border-slate-200 bg-white px-4 py-4"
            >
              <Text className="text-[15px] font-semibold text-slate-700">
                Keep current
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
