import { Image, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const placeholderIcon = require("../../../assets/images/create-actions/create-action-placeholder.png");

type CreateVoucherAction = {
  label: string;
  route?: "/sale-order-create" | "/sale-create" | "/receipt-create";
};

type CreateVoucherSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: CreateVoucherAction) => void;
};

const actions: CreateVoucherAction[] = [
  { label: "Sale Order", route: "/sale-order-create" },
  { label: "Sale", route: "/sale-create" },
  { label: "Receipt", route: "/receipt-create" },
  { label: "Purchase" },
  { label: "Sales Return" },
  { label: "Purchase Return" },
];

export function CreateVoucherSheet({
  visible,
  onClose,
  onSelect,
}: CreateVoucherSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/30">
        <Pressable className="flex-1" onPress={onClose} />

        <View
          className="rounded-t-[34px] bg-[#F4F8FA] px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="h-1.5 w-12 self-center rounded-full bg-[#C9D9DF]" />
          <Text className="mt-6 text-center text-[25px] font-extrabold text-slate-900">
            Create Voucher
          </Text>

          <View className="mt-8 flex-row flex-wrap">
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={`Create ${action.label}`}
                className="mb-7 w-1/3 items-center"
                onPress={() => onSelect(action)}
              >
                <View className="h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
                  <Image
                    source={placeholderIcon}
                    className="h-11 w-11"
                    resizeMode="contain"
                  />
                </View>
                <Text className="mt-3 text-center text-[13px] font-semibold text-slate-600">
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export type { CreateVoucherAction };
