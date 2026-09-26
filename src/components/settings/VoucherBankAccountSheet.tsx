import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, Landmark, Search, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInfinitePartyListQuery } from "@/hooks/queries/partyQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { CompanyBankAccount } from "@/types/companySettings";
import type { Party } from "@/types/party";

const PAGE_SIZE = 20;

type VoucherBankAccountSheetProps = {
  visible: boolean;
  companyId: string;
  savedBank: CompanyBankAccount | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (bankId: string | null) => void;
};

function getBankTitle(bank: Party | CompanyBankAccount): string {
  const bankName = bank.partyName || "Untitled Bank";
  return bank.bank_name ? `${bankName} - ${bank.bank_name}` : bankName;
}

function getBankDetails(bank: Party | CompanyBankAccount): string {
  const accountNumber = bank.ac_no ? `A/c ${bank.ac_no}` : "No account number";
  return bank.ifsc ? `${accountNumber} • IFSC ${bank.ifsc}` : accountNumber;
}

/**
 * Company-level default used when voucher documents show bank details.
 * It intentionally saves only the bank party id; voucher drafts stay unchanged.
 */
export function VoucherBankAccountSheet({
  visible,
  companyId,
  savedBank,
  isSaving,
  onClose,
  onSave,
}: VoucherBankAccountSheetProps) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 500);

  const banksQuery = useInfinitePartyListQuery({
    cmp_id: companyId,
    limit: PAGE_SIZE,
    search: debouncedSearchText,
    partyType: "bank",
    enabled: visible && Boolean(companyId),
  });
  const banks = useMemo(
    () => banksQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [banksQuery.data],
  );

  useEffect(() => {
    if (visible) {
      setSearchText("");
      setSelectedBankId(savedBank?._id ?? "");
    }
  }, [savedBank?._id, visible]);

  const handleLoadMore = () => {
    if (!banksQuery.hasNextPage || banksQuery.isFetchingNextPage) return;
    void banksQuery.fetchNextPage();
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
          accessibilityLabel="Close bank account selector"
          className="flex-1"
          disabled={isSaving}
          onPress={onClose}
        />

        <View
          className="h-[80%] rounded-t-[28px] bg-white px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[18px] font-extrabold text-slate-900">
                Select bank account
              </Text>
              <Text className="mt-1 text-[13px] leading-5 text-slate-500">
                Choose the default bank account for voucher documents.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={isSaving}
              hitSlop={10}
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X color="#475569" size={19} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View className="mt-4 flex-row items-center rounded-2xl border border-slate-300 bg-slate-50 px-4">
            <Search color="#64748b" size={18} strokeWidth={2.2} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search bank accounts"
              placeholderTextColor="#94a3b8"
              className="ml-3 flex-1 py-3.5 text-[14px] text-slate-900"
            />
          </View>

          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: !selectedBankId }}
            disabled={isSaving}
            onPress={() => setSelectedBankId("")}
            className={`mt-3 flex-row items-center rounded-2xl border px-4 py-4 ${
              !selectedBankId
                ? "border-[#134074] bg-blue-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Landmark color="#134074" size={19} strokeWidth={2.2} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-bold text-slate-900">
                No default bank account
              </Text>
              <Text className="mt-1 text-[12px] text-slate-500">
                Leave voucher bank details empty by default.
              </Text>
            </View>
            {!selectedBankId ? (
              <View className="h-6 w-6 items-center justify-center rounded-full bg-[#134074]">
                <Check color="#ffffff" size={15} strokeWidth={3} />
              </View>
            ) : null}
          </Pressable>

          {banksQuery.isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#134074" />
              <Text className="mt-3 text-[13px] text-slate-500">
                Loading bank accounts...
              </Text>
            </View>
          ) : banksQuery.isError ? (
            <View className="flex-1 items-center justify-center px-5">
              <Text className="text-center text-[13px] text-slate-600">
                Unable to load bank accounts right now.
              </Text>
              <Pressable
                accessibilityRole="button"
                className="mt-3 rounded-xl bg-[#134074] px-4 py-2.5"
                onPress={() => void banksQuery.refetch()}
              >
                <Text className="text-[13px] font-bold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              className="mt-3 flex-1"
              data={banks}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.4}
              renderItem={({ item }) => {
                const isSelected = item._id === selectedBankId;

                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    disabled={isSaving}
                    onPress={() => setSelectedBankId(item._id)}
                    className={`mb-2 flex-row items-center rounded-2xl border px-4 py-4 ${
                      isSelected
                        ? "border-[#134074] bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                      <Landmark color="#047857" size={19} strokeWidth={2.2} />
                    </View>
                    <View className="ml-3 flex-1 pr-3">
                      <Text className="text-[14px] font-bold text-slate-900">
                        {getBankTitle(item)}
                      </Text>
                      <Text className="mt-1 text-[12px] text-slate-500">
                        {getBankDetails(item)}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View className="h-6 w-6 items-center justify-center rounded-full bg-[#134074]">
                        <Check color="#ffffff" size={15} strokeWidth={3} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View className="items-center px-5 py-10">
                  <Text className="text-[14px] font-bold text-slate-800">
                    {debouncedSearchText
                      ? "No matching bank accounts"
                      : "No bank accounts found"}
                  </Text>
                </View>
              }
              ListFooterComponent={
                banksQuery.isFetchingNextPage ? (
                  <ActivityIndicator className="py-4" color="#134074" />
                ) : null
              }
              showsVerticalScrollIndicator={false}
            />
          )}

          <View className="mt-3 flex-row gap-3 border-t border-slate-100 pt-4">
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onClose}
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3.5"
            >
              <Text className="text-center text-[14px] font-bold text-slate-700">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => onSave(selectedBankId || null)}
              className={`flex-1 rounded-2xl bg-[#134074] px-4 py-3.5 ${
                isSaving ? "opacity-50" : ""
              }`}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-[14px] font-bold text-white">
                  Save
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
