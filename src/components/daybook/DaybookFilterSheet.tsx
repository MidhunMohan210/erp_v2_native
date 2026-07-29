import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Check, SlidersHorizontal, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TransactionDateSelector } from "@/components/voucher-create/TransactionDateSelector";
import type { DaybookFilters, VoucherType } from "@/types/voucher";
import { formatVoucherDate } from "@/utils/voucher";

type DaybookFilterSheetProps = {
  visible: boolean;
  value: DaybookFilters;
  onApply: (filters: DaybookFilters) => void;
  onClose: () => void;
};

type DatePreset = {
  id: string;
  label: string;
  from: string;
  to: string;
};

const voucherTypeOptions: { label: string; value: VoucherType }[] = [
  { label: "Sale Order", value: "saleOrder" },
  { label: "Receipt", value: "receipt" },
];

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildDatePresets(): DatePreset[] {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return [
    {
      id: "today",
      label: "Today",
      from: formatVoucherDate(today),
      to: formatVoucherDate(today),
    },
    {
      id: "yesterday",
      label: "Yesterday",
      from: formatVoucherDate(addDays(today, -1)),
      to: formatVoucherDate(addDays(today, -1)),
    },
    {
      id: "last-seven-days",
      label: "Last 7 days",
      from: formatVoucherDate(addDays(today, -6)),
      to: formatVoucherDate(today),
    },
    {
      id: "this-month",
      label: "This month",
      from: formatVoucherDate(monthStart),
      to: formatVoucherDate(today),
    },
  ];
}

export function getDefaultDaybookFilters(): DaybookFilters {
  const thisMonth = buildDatePresets().find(
    (preset) => preset.id === "this-month",
  );

  return {
    from: thisMonth?.from ?? formatVoucherDate(new Date()),
    to: thisMonth?.to ?? formatVoucherDate(new Date()),
    voucherTypes: voucherTypeOptions.map((option) => option.value),
  };
}

export function DaybookFilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: DaybookFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const presets = useMemo(buildDatePresets, []);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [value, visible]);

  const toggleVoucherType = (voucherType: VoucherType) => {
    setDraft((current) => ({
      ...current,
      voucherTypes: current.voucherTypes.includes(voucherType)
        ? current.voucherTypes.filter((item) => item !== voucherType)
        : [...current.voucherTypes, voucherType],
    }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          className="flex-1"
          onPress={onClose}
        />
        <View
          className="max-h-[92%] rounded-t-[28px] bg-white"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="items-center pt-3">
            <View className="h-1 w-12 rounded-full bg-slate-200" />
          </View>

          <View className="flex-row items-center border-b border-slate-100 px-5 py-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <SlidersHorizontal color="#2563eb" size={18} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[17px] font-extrabold text-slate-900">
                Daybook filters
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-500">
                Choose a date range and voucher types
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X color="#475569" size={18} />
            </Pressable>
          </View>

          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingVertical: 18 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-4">
              <View>
                <TransactionDateSelector
                  label="From date"
                  value={draft.from}
                  onChange={(from) =>
                    setDraft((current) => ({ ...current, from }))
                  }
                />
              </View>
              <View>
                <TransactionDateSelector
                  label="To date"
                  value={draft.to}
                  onChange={(to) =>
                    setDraft((current) => ({ ...current, to }))
                  }
                />
              </View>
            </View>

            <Text className="mb-3 mt-6 text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">
              Quick presets
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {presets.map((preset) => {
                const selected =
                  draft.from === preset.from && draft.to === preset.to;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        from: preset.from,
                        to: preset.to,
                      }))
                    }
                    className={`rounded-full border px-4 py-2.5 ${
                      selected
                        ? "border-blue-600 bg-blue-600"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-[12px] font-bold ${
                        selected ? "text-white" : "text-slate-600"
                      }`}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mb-3 mt-6 flex-row items-center justify-between">
              <Text className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">
                Voucher types
              </Text>
              <Pressable
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    voucherTypes: voucherTypeOptions.map(
                      (option) => option.value,
                    ),
                  }))
                }
              >
                <Text className="text-[12px] font-bold text-blue-600">
                  Select all
                </Text>
              </Pressable>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {voucherTypeOptions.map((option) => {
                const selected = draft.voucherTypes.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => toggleVoucherType(option.value)}
                    className={`flex-row items-center rounded-full border px-4 py-2.5 ${
                      selected
                        ? "border-blue-600 bg-blue-600"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {selected ? (
                      <Check color="#ffffff" size={14} strokeWidth={2.5} />
                    ) : null}
                    <Text
                      className={`text-[12px] font-bold ${
                        selected ? "ml-1.5 text-white" : "text-slate-600"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className="flex-row gap-3 border-t border-slate-100 px-5 pt-4">
            <Pressable
              accessibilityRole="button"
              onPress={() => setDraft(getDefaultDaybookFilters())}
              className="flex-1 rounded-2xl border border-slate-300 py-3.5"
            >
              <Text className="text-center text-[14px] font-bold text-slate-700">
                Reset
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onApply(draft);
                onClose();
              }}
              className="flex-[1.5] rounded-2xl bg-blue-600 py-3.5"
            >
              <Text className="text-center text-[14px] font-bold text-white">
                Apply filters
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
