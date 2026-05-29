import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type React from "react";
import { Pressable, Text, View } from "react-native";

type DeleteConfirmSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading?: boolean;
};

const SNAP_POINTS = ["32%"];

export default function DeleteConfirmSheet({
  sheetRef,
  title,
  description,
  onConfirm,
  isLoading = false,
}: DeleteConfirmSheetProps) {
  const handleDismiss = () => {
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: "white", borderRadius: 28 }}
      backdropComponent={(props) => (

        /// black overlay when the sheet is open
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
        />
      )}
    >
      <BottomSheetView className="px-6 pt-4 pb-8">
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <Feather name="trash-2" size={20} color="#f43f5e" />
          </View>
          <Text className="flex-1 text-lg font-bold text-slate-900">
            {title}
          </Text>
        </View>

        <Text className="mb-6 text-[15px] leading-6 text-slate-600">
          {description} This action cannot be undone.
        </Text>

        <View className="gap-3">
          <Pressable
            onPress={onConfirm}
            disabled={isLoading}
            className={`items-center rounded-2xl px-4 py-4 ${
              isLoading ? "bg-rose-300" : "bg-rose-500"
            }`}
          >
            <Text className="text-[15px] font-bold text-white">
              {isLoading ? "Deleting..." : "Yes, Delete"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDismiss}
            disabled={isLoading}
            className="items-center rounded-2xl border border-slate-200 bg-white px-4 py-4"
          >
            <Text className="text-[15px] font-semibold text-slate-700">
              Cancel
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
