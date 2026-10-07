import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { AlertTriangle } from "lucide-react-native";
import type React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ReceiptEditResetSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onCancel: () => void;
  onContinue: () => void;
  isLoading: boolean;
};

export function ReceiptEditResetSheet({
  sheetRef,
  onCancel,
  onContinue,
  isLoading,
}: ReceiptEditResetSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose={!isLoading}
      enableDynamicSizing
      onDismiss={onCancel}
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
          <View className="h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle color="#b45309" size={22} strokeWidth={2.2} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">
              Reset Bill Allocations?
            </Text>
            <Text className="mt-0.5 text-[12px] font-semibold text-slate-500">
              Latest bill balances will be loaded
            </Text>
          </View>
        </View>

        <Text className="text-[14px] leading-6 text-slate-600">
          Changing these allocations will load the latest available bill
          balances. Other Receipts or transactions may have changed these bills
          since this Receipt was created. Your current allocations will be reset
          into editable mode using the latest balances.
        </Text>

        <View className="mt-6 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => sheetRef.current?.dismiss()}
            className="flex-1 items-center rounded-2xl border border-slate-300 px-4 py-3.5"
          >
            <Text className="text-[14px] font-bold text-slate-700">Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={onContinue}
            className={`flex-1 flex-row items-center justify-center rounded-2xl bg-[#134074] px-4 py-3.5 ${
              isLoading ? "opacity-60" : ""
            }`}
          >
            {isLoading ? <ActivityIndicator color="#ffffff" size="small" /> : null}
            <Text className={`text-[14px] font-bold text-white ${isLoading ? "ml-2" : ""}`}>
              {isLoading ? "Loading..." : "Continue"}
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
