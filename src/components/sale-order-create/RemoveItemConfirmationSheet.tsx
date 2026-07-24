import { Modal, Pressable, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RemoveItemConfirmationSheetProps = {
  visible: boolean;
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RemoveItemConfirmationSheet({
  visible,
  itemName,
  onCancel,
  onConfirm,
}: RemoveItemConfirmationSheetProps) {
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
            <View className="h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 color="#e11d48" size={21} strokeWidth={2.3} />
            </View>
            <Text className="flex-1 text-[18px] font-extrabold text-slate-900">
              Remove this item?
            </Text>
          </View>

          <Text className="mb-6 text-[15px] leading-6 text-slate-600">
            {itemName || "This item"} will be removed from the current sale
            order draft.
          </Text>

          <View className="gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Confirm removal of ${itemName || "item"}`}
              onPress={onConfirm}
              className="items-center rounded-2xl bg-rose-600 px-4 py-4"
            >
              <Text className="text-[15px] font-bold text-white">
                Remove item
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel item removal"
              onPress={onCancel}
              className="items-center rounded-2xl border border-slate-200 bg-white px-4 py-4"
            >
              <Text className="text-[15px] font-semibold text-slate-700">
                Keep item
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
