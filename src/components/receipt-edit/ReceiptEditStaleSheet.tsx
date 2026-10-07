import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { RefreshCw } from "lucide-react-native";
import type React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ReceiptEditStaleSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onReload: () => void;
  isLoading: boolean;
};

export function ReceiptEditStaleSheet({
  sheetRef,
  onReload,
  isLoading,
}: ReceiptEditStaleSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose={false}
      enableDynamicSizing
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: "white", borderRadius: 28 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
          pressBehavior="none"
        />
      )}
    >
      <BottomSheetView
        className="px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <RefreshCw color="#e11d48" size={21} strokeWidth={2.2} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">
              Receipt Changed
            </Text>
            <Text className="mt-0.5 text-[12px] font-semibold text-slate-500">
              Reload before editing again
            </Text>
          </View>
        </View>
        <Text className="text-[14px] leading-6 text-slate-600">
          This Receipt or one of its linked bill balances changed after you
          opened it. Your stale edits will not be retried.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={onReload}
          className={`mt-6 flex-row items-center justify-center rounded-2xl bg-[#134074] px-4 py-4 ${
            isLoading ? "opacity-60" : ""
          }`}
        >
          {isLoading ? <ActivityIndicator color="#ffffff" size="small" /> : null}
          <Text className={`text-[14px] font-bold text-white ${isLoading ? "ml-2" : ""}`}>
            {isLoading ? "Reloading..." : "Reload"}
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
