import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Check, FileText, Printer, ReceiptText, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SaleOrderPrintFormat } from "@/types/saleOrderPrint";

type PrintFormatIcon = React.ComponentType<{
  color: string;
  size: number;
  strokeWidth: number;
}>;

type PrintFormatOption = {
  value: SaleOrderPrintFormat;
  title: string;
  description: string;
  icon: PrintFormatIcon;
};

type PrintFormatSheetProps = {
  visible: boolean;
  onClose: () => void;
  onContinue: (format: SaleOrderPrintFormat) => void;
  initialFormat?: SaleOrderPrintFormat;
};

const PRINT_FORMAT_OPTIONS: PrintFormatOption[] = [
  {
    value: "a4",
    title: "A4 Document",
    description:
      "Full-page sale order for PDF download and regular printing.",
    icon: FileText,
  },
  {
    value: "thermal80",
    title: "80 mm Thermal",
    description: "Receipt format for standard POS printers.",
    icon: Printer,
  },
  // {
  //   value: "thermal58",
  //   title: "58 mm Thermal",
  //   description: "Compact receipt format for smaller POS printers.",
  //   icon: ReceiptText,
  // },
];

export function PrintFormatSheet({
  visible,
  onClose,
  onContinue,
  initialFormat,
}: PrintFormatSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);
  const [selectedFormat, setSelectedFormat] =
    useState<SaleOrderPrintFormat | null>(initialFormat ?? null);

  useEffect(() => {
    if (visible) {
      setSelectedFormat(initialFormat ?? null);
      isPresentedRef.current = true;
      sheetRef.current?.present();
      return;
    }

    // Do not dismiss on the initial hidden render. Gorhom can otherwise remain
    // in a dismissing state before the sheet has ever been presented.
    if (isPresentedRef.current) {
      isPresentedRef.current = false;
      sheetRef.current?.dismiss();
    }
  }, [initialFormat, visible]);

  const closeSheet = () => {
    isPresentedRef.current = false;
    sheetRef.current?.dismiss();
  };

  const continueToPreview = () => {
    if (!selectedFormat) return;
    isPresentedRef.current = false;
    sheetRef.current?.dismiss();
    onContinue(selectedFormat);
  };

  const handleDismiss = () => {
    isPresentedRef.current = false;
    onClose();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose
      onDismiss={handleDismiss}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 28 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
          pressBehavior="close"
        />
      )}
    >
      <BottomSheetView
        className="px-5 pt-2"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="mb-5 flex-row items-start">
          <View className="flex-1 pr-4">
            <Text className="text-[19px] font-extrabold text-slate-900">
              Choose document format
            </Text>
            <Text className="mt-1 text-[12px] leading-5 text-slate-500">
              Select the format you want to preview.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close print format selection"
            hitSlop={8}
            onPress={closeSheet}
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
          >
            <X color="#475569" size={19} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View className="gap-3">
          {PRINT_FORMAT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedFormat === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={option.title}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedFormat(option.value)}
                className={`flex-row items-center rounded-2xl border px-4 py-4 ${
                  isSelected
                    ? "border-[#134074] bg-[#134074]/[0.08]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <View
                  className={`h-11 w-11 items-center justify-center rounded-xl ${
                    isSelected ? "bg-[#134074]" : "bg-slate-100"
                  }`}
                >
                  <Icon
                    color={isSelected ? "#ffffff" : "#475569"}
                    size={21}
                    strokeWidth={2.1}
                  />
                </View>

                <View className="ml-3 flex-1 pr-3">
                  <Text
                    className={`text-[14px] font-extrabold ${
                      isSelected ? "text-[#134074]" : "text-slate-900"
                    }`}
                  >
                    {option.title}
                  </Text>
                  <Text className="mt-1 text-[11px] leading-4 text-slate-500">
                    {option.description}
                  </Text>
                </View>

                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-[#134074] bg-[#134074]"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected ? (
                    <Check color="#ffffff" size={14} strokeWidth={3} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue to print preview"
          accessibilityState={{ disabled: !selectedFormat }}
          disabled={!selectedFormat}
          onPress={continueToPreview}
          className={`mt-6 items-center rounded-2xl px-4 py-4 ${
            selectedFormat ? "bg-[#134074]" : "bg-slate-200"
          }`}
        >
          <Text
            className={`text-[15px] font-bold ${
              selectedFormat ? "text-white" : "text-slate-400"
            }`}
          >
            Continue
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
