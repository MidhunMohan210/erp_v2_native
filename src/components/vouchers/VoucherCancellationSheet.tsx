import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ban } from "lucide-react-native";
import type React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type VoucherCancellationSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  voucherLabel: string;
  voucherNumber: string;
  onConfirm: () => void;
  isLoading?: boolean;
};

export function VoucherCancellationSheet({
  sheetRef,
  voucherLabel,
  voucherNumber,
  onConfirm,
  isLoading = false,
}: VoucherCancellationSheetProps) {
  const insets = useSafeAreaInsets();

  const handleDismiss = () => {
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose={!isLoading}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: "white", borderRadius: 28 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
          pressBehavior={isLoading ? "none" : "close"}
        />
      )}
    >
      <BottomSheetView
        className="px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <Ban color="#e11d48" size={21} strokeWidth={2.2} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">
              Cancel {voucherLabel}?
            </Text>
            <Text className="mt-0.5 text-[12px] font-semibold text-slate-500">
              {voucherNumber}
            </Text>
          </View>
        </View>

        <Text className="mb-6 text-[15px] leading-6 text-slate-600">
          This will mark the {voucherLabel} as cancelled. Its history will
          remain available, but it can no longer be edited or converted.
        </Text>

        <View className="gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Confirm cancellation of ${voucherLabel}`}
            onPress={onConfirm}
            disabled={isLoading}
            className={`items-center rounded-2xl px-4 py-4 ${
              isLoading ? "bg-rose-300" : "bg-rose-600"
            }`}
          >
            <Text className="text-[15px] font-bold text-white">
              {isLoading ? "Cancelling..." : `Yes, Cancel ${voucherLabel}`}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Keep ${voucherLabel}`}
            onPress={handleDismiss}
            disabled={isLoading}
            className="items-center rounded-2xl border border-slate-200 bg-white px-4 py-4"
          >
            <Text className="text-[15px] font-semibold text-slate-700">
              Keep {voucherLabel}
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
