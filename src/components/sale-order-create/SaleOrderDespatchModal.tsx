import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SaleOrderDespatchDetails } from "@/types/saleOrder";

type DespatchDetailField =
  | "challanNo"
  | "containerNo"
  | "despatchThrough"
  | "destination"
  | "vehicleNo"
  | "orderNo"
  | "termsOfPay"
  | "termsOfDelivery";

type SaleOrderDespatchModalProps = {
  visible: boolean;
  details: SaleOrderDespatchDetails;
  onClose: () => void;
  onSave: (details: SaleOrderDespatchDetails) => void;
};

type DespatchInputProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  autoCapitalize?: "sentences" | "characters";
};

function DespatchInput({
  label,
  value,
  placeholder,
  onChangeText,
  multiline = false,
  autoCapitalize = "sentences",
}: DespatchInputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-[12px] font-bold text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 ${
          multiline ? "min-h-[76px]" : ""
        }`}
      />
    </View>
  );
}

export function SaleOrderDespatchModal({
  visible,
  details,
  onClose,
  onSave,
}: SaleOrderDespatchModalProps) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(details);

  useEffect(() => {
    if (visible) setForm(details);
  }, [details, visible]);

  const updateField = (field: DespatchDetailField, value: string) => {
    // The field union limits updates to the eight supported backend fields.
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/35">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close despatch details"
          className="flex-1"
          onPress={onClose}
        />
        <View className="h-[86%] rounded-t-[28px] bg-slate-50 pt-5">
          <View className="flex-row items-start justify-between px-5 pb-4">
            <View className="flex-1 pr-4">
              <Text className="text-[18px] font-extrabold text-slate-900">
                Despatch details
              </Text>
              <Text className="mt-1 text-[13px] leading-5 text-slate-500">
                Enter transport, destination and order references.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-200"
            >
              <X color="#475569" size={19} strokeWidth={2.2} />
            </Pressable>
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={90}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4 }}
          >
            <DespatchInput
              label="Challan number"
              value={form.challanNo}
              placeholder="Enter challan number"
              autoCapitalize="characters"
              onChangeText={(value) => updateField("challanNo", value)}
            />
            <DespatchInput
              label="Container number"
              value={form.containerNo}
              placeholder="Enter container number"
              autoCapitalize="characters"
              onChangeText={(value) => updateField("containerNo", value)}
            />
            <DespatchInput
              label="Despatch through"
              value={form.despatchThrough}
              placeholder="Enter transporter or method"
              onChangeText={(value) => updateField("despatchThrough", value)}
            />
            <DespatchInput
              label="Destination"
              value={form.destination}
              placeholder="Enter destination"
              onChangeText={(value) => updateField("destination", value)}
            />
            <DespatchInput
              label="Vehicle number"
              value={form.vehicleNo}
              placeholder="Enter vehicle number"
              autoCapitalize="characters"
              onChangeText={(value) => updateField("vehicleNo", value)}
            />
            <DespatchInput
              label="Order number"
              value={form.orderNo}
              placeholder="Enter customer order number"
              autoCapitalize="characters"
              onChangeText={(value) => updateField("orderNo", value)}
            />
            <DespatchInput
              label="Terms of payment"
              value={form.termsOfPay}
              placeholder="Enter payment terms"
              multiline
              onChangeText={(value) => updateField("termsOfPay", value)}
            />
            <DespatchInput
              label="Terms of delivery"
              value={form.termsOfDelivery}
              placeholder="Enter delivery terms"
              multiline
              onChangeText={(value) => updateField("termsOfDelivery", value)}
            />
          </KeyboardAwareScrollView>

          <View
            className="flex-row gap-3 border-t border-slate-200 bg-white px-5 pt-4"
            style={{ paddingBottom: insets.bottom + 14 }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3.5"
            >
              <Text className="text-center text-[14px] font-bold text-slate-700">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onSave(form)}
              className="flex-1 rounded-2xl bg-[#134074] px-4 py-3.5"
            >
              <Text className="text-center text-[14px] font-bold text-white">
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
