import { Fragment, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import saleOderIcon from "../../../assets/home/sale6.png"; 
import saleIcon from "../../../assets/home/saleOrder.png"; 
import purchaseIcon from "../../../assets/home/purchase.png"; 
import receiptIcon from "../../../assets/home/receipt5.png"; 
const placeholderIcon = require("../../../assets/images/create-actions/create-action-placeholder.png");

// Change this default, or set iconSize on one action, to resize voucher icons.
export const CREATE_VOUCHER_ICON_SIZE = 36;

type CreateVoucherAction = {
  label: string;
  route?: "/sale-order-create" | "/sale-create" | "/receipt-create";
  icon: ImageSourcePropType;
  iconSize?: number;
};

type CreateVoucherSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: CreateVoucherAction) => void;
};

const actions: CreateVoucherAction[] = [
  { label: "Sale Order", route: "/sale-order-create", icon: saleOderIcon, },
  { label: "Sale", route: "/sale-create", icon: saleIcon,iconSize: 36 },
  { label: "Receipt", route: "/receipt-create", icon: receiptIcon },
  // { label: "Purchase", route: "/purchase-create", icon: purchaseIcon },
  // { label: "Sales Return", route: "/sales-return-create", icon: placeholderIcon },
  // { label: "Purchase Return", route: "/purchase-return-create", icon: placeholderIcon },
];

export function CreateVoucherSheet({
  visible,
  onClose,
  onSelect,
}: CreateVoucherSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(visible);
  const sheetProgress = useRef(new Animated.Value(visible ? 0 : 1)).current;
  const sheetHeight = windowHeight * 0.5; // Adjust the height of the sheet as needed

  useEffect(() => {
    if (visible) setIsMounted(true);

    // Keep the sheet mounted until its closing animation finishes.
    const animation = Animated.timing(sheetProgress, {
      toValue: visible ? 0 : 1,
      duration: 260,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (!visible && finished) setIsMounted(false);
    });

    return () => animation.stop();
  }, [sheetProgress, visible]);

  if (!isMounted) return null;

  const translateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sheetHeight],
  });

  return (
    <Fragment>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close create voucher menu"
        className="absolute bottom-0 left-0 right-0 top-0"
        style={{ zIndex: 0 }}
        onPress={onClose}
      />

      <Animated.View
        className="absolute bottom-0 left-0 right-0 rounded-t-[34px] bg-[#f2f7f8] shadow-2xl px-5 pt-4"
        style={{
          height: sheetHeight,
          paddingBottom: insets.bottom + 104,
          zIndex: 1,
          transform: [{ translateY }],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close create voucher menu"
          className="h-1.5 w-12 self-center rounded-full bg-[#d5e0e4] shadow-2xl"
          onPress={onClose}
        />
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
              <View className="h-[70px] w-[70px] items-center justify-center rounded-full bg-white shadow-sm">
                <Image
                  source={action.icon}
                  resizeMode="contain"
                  style={{
                    width: action.iconSize ?? CREATE_VOUCHER_ICON_SIZE,
                    height: action.iconSize ?? CREATE_VOUCHER_ICON_SIZE,
                  }}
                />
              </View>
              <Text className="mt-3 text-center text-[13px] font-semibold text-slate-600">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Fragment>
  );
}

export type { CreateVoucherAction };
