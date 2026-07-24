import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  SaleOrderDiscountType,
  SaleOrderItem,
} from "@/types/saleOrder";
import type { SaleTaxType } from "@/types/voucher";
import { calculateSaleOrderItem } from "@/utils/saleOrder";

type ItemForm = {
  rate: string;
  actualQty: string;
  billedQty: string;
  taxInclusive: boolean;
  discountType: SaleOrderDiscountType;
  discountValue: string;
  description: string;
};

type SaleOrderItemEditModalProps = {
  visible: boolean;
  item: SaleOrderItem | null;
  taxType: SaleTaxType;
  onClose: () => void;
  onSave: (item: SaleOrderItem) => void;
  onRemove: (itemId: string) => void;
};

type NumberInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

const emptyForm: ItemForm = {
  rate: "",
  actualQty: "",
  billedQty: "",
  taxInclusive: false,
  discountType: "percentage",
  discountValue: "",
  description: "",
};

const discountTypes: SaleOrderDiscountType[] = ["percentage", "amount"];

function NumberInput({ label, value, onChangeText }: NumberInputProps) {
  return (
    <View className="mb-4 flex-1">
      <Text className="mb-2 text-[12px] font-bold text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#94a3b8"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900"
      />
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row justify-between border-b border-slate-100 py-2.5 last:border-b-0">
      <Text className="text-[12px] text-slate-600">{label}</Text>
      <Text className="text-[12px] font-bold text-slate-900">
        {value.toFixed(2)}
      </Text>
    </View>
  );
}

function formatRate(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export function SaleOrderItemEditModal({
  visible,
  item,
  taxType,
  onClose,
  onSave,
  onRemove,
}: SaleOrderItemEditModalProps) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<ItemForm>(emptyForm);

  useEffect(() => {
    if (!visible || !item) return;
    setForm({
      rate: String(item.rate),
      actualQty: String(item.actualQty),
      billedQty: String(item.billedQty),
      taxInclusive: item.taxInclusive,
      discountType: item.discountType,
      discountValue: String(
        item.discountType === "percentage"
          ? item.discountPercentage
          : item.discountAmount,
      ),
      description: item.description,
    });
  }, [item, visible]);

  const preview = useMemo(() => {
    if (!item) return null;
    const discountValue = Number(form.discountValue) || 0;
    return calculateSaleOrderItem(
      {
        ...item,
        rate: Number(form.rate) || 0,
        actualQty: Number(form.actualQty) || 0,
        billedQty: Number(form.billedQty) || 0,
        taxInclusive: form.taxInclusive,
        discountType: form.discountType,
        discountPercentage:
          form.discountType === "percentage" ? discountValue : 0,
        discountAmount: form.discountType === "amount" ? discountValue : 0,
        description: form.description,
      },
      taxType,
    );
  }, [form, item, taxType]);

  const handleSave = () => {
    if (!preview) return;
    onSave(preview);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/35">
        <View className="h-[90%] rounded-t-[28px] bg-slate-50 pt-5">
          <View className="flex-row items-start justify-between px-5 pb-4">
            <View className="flex-1 pr-4">
              <Text numberOfLines={1} className="text-[18px] font-extrabold text-slate-900">
                {item?.name || "Edit item"}
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                Update quantity, rate, discount and tax settings.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close item editor"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-200"
            >
              <X color="#475569" size={19} strokeWidth={2.2} />
            </Pressable>
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={100}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          >
            <NumberInput
              label="Rate"
              value={form.rate}
              onChangeText={(rate) => setForm((current) => ({ ...current, rate }))}
            />

            <View className="flex-row gap-3">
              <NumberInput
                label="Actual quantity"
                value={form.actualQty}
                onChangeText={(actualQty) =>
                  setForm((current) => ({
                    ...current,
                    actualQty,
                    // Actual quantity is the source value, so billed quantity
                    // follows it until the user edits billed quantity directly.
                    billedQty: actualQty,
                  }))
                }
              />
              <NumberInput
                label="Billed quantity"
                value={form.billedQty}
                onChangeText={(billedQty) =>
                  setForm((current) => ({ ...current, billedQty }))
                }
              />
            </View>

            <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <View className="flex-1 pr-3">
                <Text className="text-[13px] font-bold text-slate-800">
                  Tax-inclusive rate
                </Text>
                <Text className="mt-1 text-[11px] text-slate-500">
                  Remove GST from the entered rate before calculation.
                </Text>
              </View>
              <Switch
                value={form.taxInclusive}
                onValueChange={(taxInclusive) =>
                  setForm((current) => ({ ...current, taxInclusive }))
                }
                trackColor={{ false: "#cbd5e1", true: "#5eead4" }}
                thumbColor={form.taxInclusive ? "#0f766e" : "#f8fafc"}
              />
            </View>

            <Text className="mb-2 text-[12px] font-bold text-slate-700">
              Discount type
            </Text>
            <View className="mb-4 flex-row gap-3">
              {discountTypes.map(
                (discountType) => (
                  <Pressable
                    key={discountType}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        discountType,
                        discountValue: "",
                      }))
                    }
                    className={`flex-1 rounded-2xl border px-4 py-3 ${
                      form.discountType === discountType
                        ? "border-teal-700 bg-teal-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <Text className="text-center text-[12px] font-bold capitalize text-slate-700">
                      {discountType}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            <NumberInput
              label={
                form.discountType === "percentage"
                  ? "Discount percentage"
                  : "Discount amount"
              }
              value={form.discountValue}
              onChangeText={(discountValue) =>
                setForm((current) => ({ ...current, discountValue }))
              }
            />

            <View className="mb-4">
              <Text className="mb-2 text-[12px] font-bold text-slate-700">
                Description
              </Text>
              <TextInput
                value={form.description}
                onChangeText={(description) =>
                  setForm((current) => ({ ...current, description }))
                }
                multiline
                textAlignVertical="top"
                placeholder="Optional item description"
                placeholderTextColor="#94a3b8"
                className="min-h-[76px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900"
              />
            </View>

            {preview ? (
              <View className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
                <Text className="border-b border-slate-100 py-3 text-[12px] font-extrabold uppercase tracking-wider text-slate-500">
                  Calculation preview
                </Text>
                <SummaryRow label="Base price" value={preview.basePrice} />
                <SummaryRow label="Discount" value={preview.discountAmount} />
                <SummaryRow label="Taxable amount" value={preview.taxableAmount} />
                <SummaryRow
                  label={`GST (${formatRate(preview.taxRate)}%)`}
                  value={preview.taxAmount}
                />
                <SummaryRow
                  label={`Cess (${formatRate(preview.cess)}%)`}
                  value={preview.cessAmount}
                />
                <SummaryRow
                  label={`Additional cess (${formatRate(preview.addlCess)}/unit)`}
                  value={preview.addlCessAmount}
                />
                <SummaryRow label="Line total" value={preview.totalAmount} />
              </View>
            ) : null}
          </KeyboardAwareScrollView>

          <View
            className="flex-row gap-2 border-t border-slate-200 bg-white px-5 pt-4"
            style={{ paddingBottom: insets.bottom + 14 }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => item && onRemove(item.id)}
              className="rounded-2xl bg-rose-50 px-4 py-3.5"
            >
              <Text className="text-center text-[13px] font-bold text-rose-700">
                Remove
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3.5"
            >
              <Text className="text-center text-[13px] font-bold text-slate-700">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              className="flex-1 rounded-2xl bg-[#134074] px-4 py-3.5"
            >
              <Text className="text-center text-[13px] font-bold text-white">
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
