import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { AlertTriangle } from "lucide-react-native";
import type React from "react";
import { Pressable, Text, View } from "react-native";

type DiscardDraftSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  voucherLabel: string;
  onConfirm: () => void;
};

const SNAP_POINTS = ["32%"];

// The same warning is used by every voucher-creation screen that discards its
// Redux draft when the user confirms Back navigation.
export function DiscardDraftSheet({
  sheetRef,
  voucherLabel,
  onConfirm,
}: DiscardDraftSheetProps) {
  const handleConfirm = () => {
    sheetRef.current?.dismiss();
    onConfirm();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: "white", borderRadius: 28 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
        />
      )}
    >
      <BottomSheetView className="px-6 pb-8 pt-4">
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle color="#b45309" size={21} strokeWidth={2.2} />
          </View>
          <Text className="flex-1 text-lg font-bold text-slate-900">
            Clear {voucherLabel} draft?
          </Text>
        </View>

        <Text className="mb-6 text-[15px] leading-6 text-slate-600">
          Going back will clear the entered {voucherLabel} details.
        </Text>

        <View className="gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${voucherLabel} draft and go back`}
            onPress={handleConfirm}
            className="items-center rounded-2xl bg-rose-600 px-4 py-4"
          >
            <Text className="text-[15px] font-bold text-white">Go back</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Keep ${voucherLabel} draft`}
            onPress={() => sheetRef.current?.dismiss()}
            className="items-center rounded-2xl border border-slate-200 bg-white px-4 py-4"
          >
            <Text className="text-[15px] font-semibold text-slate-700">
              Keep editing
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
