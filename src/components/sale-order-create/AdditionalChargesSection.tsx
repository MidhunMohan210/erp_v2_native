import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, ChevronRight, ReceiptText, X } from "lucide-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAdditionalChargeListQuery } from "@/hooks/queries/additionalChargeQueries";
import type {
  AdditionalChargeAction,
  AdditionalChargeMaster,
  SaleOrderAdditionalCharge,
  SaleOrderAdditionalChargeTotals,
} from "@/types/saleOrder";
import type { SaleTaxType } from "@/types/voucher";
import {
  calculateAdditionalCharge,
  createAdditionalCharge,
} from "@/utils/additionalCharge";

type AdditionalChargesSectionProps = {
  companyId: string;
  hasItems: boolean;
  taxType: SaleTaxType;
  selectedCharges: SaleOrderAdditionalCharge[];
  totals: SaleOrderAdditionalChargeTotals;
  onSave: (charges: SaleOrderAdditionalCharge[]) => void;
};

const chargeActions: AdditionalChargeAction[] = ["add", "subtract"];

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function getTaxDescription(charge: AdditionalChargeMaster): string {
  const rates = [
    charge.igst ? `IGST ${formatMoney(Number(charge.igst))}%` : "",
    charge.cgst ? `CGST ${formatMoney(Number(charge.cgst))}%` : "",
    charge.sgst ? `SGST ${formatMoney(Number(charge.sgst))}%` : "",
    charge.cess ? `Cess ${formatMoney(Number(charge.cess))}%` : "",
    charge.addl_cess
      ? `Addl. cess ${formatMoney(Number(charge.addl_cess))}%`
      : "",
    charge.state_cess
      ? `State cess ${formatMoney(Number(charge.state_cess))}%`
      : "",
  ].filter(Boolean);

  return rates.length > 0 ? rates.join(" · ") : "No tax";
}

export function AdditionalChargesSection({
  companyId,
  hasItems,
  taxType,
  selectedCharges, //Contains the charges currently saved in the voucher draft.
  totals, // Contains the already-calculated additional-charge totals.
  //{
  //   totalAdditionalCharge: 118,
  //   totalAdditionalChargeTax: 18
  // }
  onSave,
}: AdditionalChargesSectionProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [draftCharges, setDraftCharges] =
    useState<SaleOrderAdditionalCharge[]>(selectedCharges);
  const chargesQuery = useAdditionalChargeListQuery(
    companyId,
    isOpen && hasItems,
  );

  useEffect(() => {
    setIsOpen(false);
    setDraftCharges([]);
  }, [companyId]);

  const previewText = useMemo(
    () =>
      selectedCharges
        .slice(0, 2)
        .map((charge) => `${charge.option} ${formatMoney(charge.finalValue)}`)
        .join(" · "),
    [selectedCharges],
  );

  const draftTotal = useMemo(
    () => draftCharges.reduce((total, charge) => total + charge.finalValue, 0),
    [draftCharges],
  );

  const openSheet = () => {
    if (!hasItems) return;
    setDraftCharges(selectedCharges.map((charge) => ({ ...charge })));
    setIsOpen(true);
  };

  const closeSheet = () => {
    setIsOpen(false);
  };

  const toggleCharge = (master: AdditionalChargeMaster) => {
    setDraftCharges((current) => {
      const isSelected = current.some((charge) => charge._id === master._id);
      //When the charge is already selected
      // It removes the charge:
      if (isSelected) {
        return current.filter((charge) => charge._id !== master._id);
      }
      return [...current, createAdditionalCharge(master, taxType)];
    });
  };

  const updateCharge = (
    chargeId: string,
    changes: { value?: string; action?: AdditionalChargeAction },
  ) => {
    setDraftCharges((current) =>
      current.map((charge) =>
        charge._id === chargeId
          ? calculateAdditionalCharge(
              {
                ...charge,
                ...changes,
              },
              taxType,
            )
          : charge,
      ),
    );
  };

  const saveCharges = () => {
    // A checked master without an entered amount is not a valid saved charge.
    // Explicit values such as "0" remain valid because they are not blank.
    const chargesWithAmounts = draftCharges.filter(
      (charge) => charge.value.trim() !== "",
    );
    onSave(chargesWithAmounts);
    setIsOpen(false);
  };

  return (
    <>
      <View className="rounded-[22px] border border-slate-200 bg-white p-5">
        <View className="mb-4 flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
            <ReceiptText color="#2563eb" size={21} strokeWidth={2.2} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[16px] font-extrabold text-slate-900">
              Additional charges
            </Text>
            <Text className="mt-1 text-[12px] text-slate-500">
              Apply extra charges or deductions with tax.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open additional charges"
          accessibilityState={{ disabled: !hasItems }}
          disabled={!hasItems}
          onPress={openSheet}
          className={`flex-row items-center rounded-2xl border px-4 py-4 ${
            hasItems
              ? "border-blue-200 bg-blue-50"
              : "border-slate-200 bg-slate-100"
          }`}
        >
          <View className="flex-1 pr-3">
            <Text className="text-[14px] font-extrabold text-slate-900">
              {selectedCharges.length > 0
                ? `${selectedCharges.length} charge${
                    selectedCharges.length === 1 ? "" : "s"
                  } selected`
                : "Add additional charges"}
            </Text>
            <Text numberOfLines={1} className="mt-1 text-[11px] text-slate-500">
              {selectedCharges.length > 0
                ? previewText
                : hasItems
                  ? "Choose charge heads and set add or subtract values"
                  : "Add products first to apply additional charges"}
            </Text>
          </View>
          <Text className="mr-2 text-[12px] font-bold text-blue-700">
            {formatMoney(totals.totalAdditionalCharge)}
          </Text>
          <ChevronRight color="#2563eb" size={18} strokeWidth={2.2} />
        </Pressable>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="h-[90%] rounded-t-[28px] bg-slate-50 pt-5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="flex-row items-start justify-between px-5 pb-4">
              <View className="flex-1 pr-4">
                <Text className="text-[18px] font-extrabold text-slate-900">
                  Additional charges
                </Text>
                <Text className="mt-1 text-[12px] text-slate-500">
                  Select charges, enter amounts and choose add or subtract.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close additional charges"
                onPress={closeSheet}
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
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 20,
              }}
            >
              {chargesQuery.isLoading ? (
                <View className="items-center py-16">
                  <ActivityIndicator color="#2563eb" />
                  <Text className="mt-3 text-[12px] text-slate-500">
                    Loading additional charges...
                  </Text>
                </View>
              ) : chargesQuery.isError ? (
                <View className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                  <Text className="text-[12px] text-rose-700">
                    Additional charges could not be loaded.
                  </Text>
                  <Pressable
                    onPress={() => void chargesQuery.refetch()}
                    className="mt-3"
                  >
                    <Text className="text-[12px] font-bold text-rose-700">
                      Retry
                    </Text>
                  </Pressable>
                </View>
              ) : (chargesQuery.data ?? []).length === 0 ? (
                <View className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6">
                  <Text className="text-center text-[12px] text-slate-500">
                    No additional charges are available for this company.
                  </Text>
                </View>
              ) : (
                (chargesQuery.data ?? []).map((master) => {
                  const selected = draftCharges.find(
                    (charge) => charge._id === master._id,
                  );

                  return (
                    <View
                      key={master._id}
                      className="mb-3 rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: Boolean(selected) }}
                        onPress={() => toggleCharge(master)}
                        className="flex-row items-start"
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-[14px] font-extrabold text-slate-900">
                            {master.name || "Additional Charge"}
                          </Text>
                          <Text className="mt-1 text-[11px] leading-4 text-slate-500">
                            {getTaxDescription(master)}
                            {master.hsn ? ` · HSN ${master.hsn}` : ""}
                          </Text>
                        </View>
                        <View
                          className={`h-6 w-6 items-center justify-center rounded-full ${
                            selected ? "bg-blue-600" : "bg-slate-200"
                          }`}
                        >
                          {selected ? (
                            <Check color="#ffffff" size={14} strokeWidth={3} />
                          ) : null}
                        </View>
                      </Pressable>

                      {selected ? (
                        <View className="mt-4 border-t border-slate-100 pt-4">
                          <Text className="mb-2 text-[11px] font-bold text-slate-600">
                            Amount
                          </Text>
                          <TextInput
                            value={selected.value}
                            onChangeText={(value) =>
                              updateCharge(selected._id, { value })
                            }
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#94a3b8"
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900"
                          />

                          <Text className="mb-2 mt-4 text-[11px] font-bold text-slate-600">
                            Action
                          </Text>
                          <View className="flex-row gap-3">
                            {chargeActions.map((action) => (
                              <Pressable
                                key={action}
                                onPress={() =>
                                  updateCharge(selected._id, { action })
                                }
                                className={`flex-1 rounded-xl border px-3 py-3 ${
                                  selected.action === action
                                    ? "border-blue-600 bg-blue-50"
                                    : "border-slate-200 bg-white"
                                }`}
                              >
                                <Text className="text-center text-[12px] font-bold capitalize text-slate-700">
                                  {action}
                                </Text>
                              </Pressable>
                            ))}
                          </View>

                          <View className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
                            <Text className="text-[11px] text-slate-600">
                              Tax: {formatMoney(selected.taxAmount)}
                            </Text>
                            <Text className="mt-1 text-[12px] font-extrabold text-slate-900">
                              Final impact: {formatMoney(selected.finalValue)}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </KeyboardAwareScrollView>

            <View className="border-t border-slate-200 bg-white px-5 pt-4">
              <View className="mb-3 flex-row items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                <Text className="text-[12px] text-slate-600">
                  Net charge impact
                </Text>
                <Text className="text-[14px] font-extrabold text-slate-900">
                  {formatMoney(draftTotal)}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={closeSheet}
                  className="flex-1 items-center rounded-xl border border-slate-300 py-3.5"
                >
                  <Text className="text-[13px] font-bold text-slate-700">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={saveCharges}
                  className="flex-1 items-center rounded-xl bg-blue-600 py-3.5"
                >
                  <Text className="text-[13px] font-bold text-white">
                    Save charges
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
