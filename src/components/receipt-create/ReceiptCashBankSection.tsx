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
import {
  Banknote,
  Check,
  ChevronRight,
  Landmark,
  Search,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInfinitePartyListQuery } from "@/hooks/queries/partyQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Party } from "@/types/party";
import type { ReceiptInstrumentType } from "@/types/receipt";
import { getRequiredReceiptAccountType } from "@/utils/receipt";

const PAGE_SIZE = 20;

type ReceiptCashBankSectionProps = {
  companyId: string;
  instrumentType: ReceiptInstrumentType;
  selectedAccount: Party | null;
  onSelect: (account: Party) => void;
  disabled?: boolean;
};

function getAccountDetails(account: Party): string {
  if (account.partyType === "cash") return "Cash ledger";

  const accountNumber = account.ac_no ? `A/c ${account.ac_no}` : "Bank ledger";
  return account.bank_name
    ? `${account.bank_name} • ${accountNumber}`
    : accountNumber;
}

export function ReceiptCashBankSection({
  companyId,
  instrumentType,
  selectedAccount,
  onSelect,
  disabled = false,
}: ReceiptCashBankSectionProps) {
  const insets = useSafeAreaInsets();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 500);
  const requiredAccountType = getRequiredReceiptAccountType(instrumentType);
  const isCash = requiredAccountType === "cash";
  const accountLabel = isCash ? "Cash account" : "Bank account";

  const accountsQuery = useInfinitePartyListQuery({
    cmp_id: companyId,
    limit: PAGE_SIZE,
    search: debouncedSearchText,
    partyType: requiredAccountType,
    enabled: isModalOpen && Boolean(companyId) && !disabled,
  });
  const accounts = useMemo(
    () =>
      (accountsQuery.data?.pages.flatMap((page) => page.items) ?? []).filter(
        (account) => account.partyType === requiredAccountType,
      ),
    [accountsQuery.data, requiredAccountType],
  );

  useEffect(() => {
    if (!isModalOpen) setSearchText("");
  }, [isModalOpen]);

  const handleLoadMore = () => {
    if (!accountsQuery.hasNextPage || accountsQuery.isFetchingNextPage) return;
    void accountsQuery.fetchNextPage();
  };

  const handleSelect = (account: Party) => {
    onSelect(account);
    setIsModalOpen(false);
  };

  const AccountIcon = isCash ? Banknote : Landmark;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select ${accountLabel.toLowerCase()}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setIsModalOpen(true)}
        className={`rounded-3xl bg-white p-5 shadow-sm ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <View className="min-h-16 flex-row items-center">
          <View
            className={`h-12 w-12 items-center justify-center rounded-2xl ${
              isCash ? "bg-emerald-50" : "bg-indigo-50"
            }`}
          >
            <AccountIcon
              color={isCash ? "#047857" : "#4f46e5"}
              size={22}
              strokeWidth={2.2}
            />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Received into <Text className="text-rose-500">*</Text>
            </Text>
            <Text
              numberOfLines={1}
              className={`mt-1 text-[15px] font-bold ${
                selectedAccount ? "text-slate-900" : "text-[#134074]"
              }`}
            >
              {selectedAccount?.partyName || `Select ${accountLabel}`}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-[12px] text-slate-500">
              {selectedAccount
                ? getAccountDetails(selectedAccount)
                : `${instrumentType.toUpperCase()} requires a ${accountLabel.toLowerCase()}`}
            </Text>
          </View>
          <ChevronRight color="#94a3b8" size={20} strokeWidth={2.2} />
        </View>
      </Pressable>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/35">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close account selector"
            className="flex-1"
            onPress={() => setIsModalOpen(false)}
          />
          <View
            className="h-[80%] rounded-t-[28px] bg-white px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[18px] font-extrabold text-slate-900">
                  Select {accountLabel.toLowerCase()}
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-slate-500">
                  Only compatible {requiredAccountType} ledgers are shown.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                onPress={() => setIsModalOpen(false)}
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
                placeholder={`Search ${accountLabel.toLowerCase()}s`}
                placeholderTextColor="#94a3b8"
                className="ml-3 flex-1 py-3.5 text-[14px] text-slate-900"
              />
            </View>

            {accountsQuery.isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#134074" />
                <Text className="mt-3 text-[13px] text-slate-500">
                  Loading {accountLabel.toLowerCase()}s...
                </Text>
              </View>
            ) : accountsQuery.isError ? (
              <View className="flex-1 items-center justify-center px-5">
                <Text className="text-center text-[13px] text-slate-600">
                  Unable to load {accountLabel.toLowerCase()}s right now.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void accountsQuery.refetch()}
                  className="mt-3 rounded-xl bg-[#134074] px-4 py-2.5"
                >
                  <Text className="text-[13px] font-bold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                className="mt-3 flex-1"
                data={accounts}
                keyExtractor={(item) => item._id}
                keyboardShouldPersistTaps="handled"
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.4}
                renderItem={({ item }) => {
                  const isSelected = item._id === selectedAccount?._id;

                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => handleSelect(item)}
                      className={`mb-2 flex-row items-center rounded-2xl border px-4 py-4 ${
                        isSelected
                          ? "border-[#134074] bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full ${
                          isCash ? "bg-emerald-50" : "bg-indigo-50"
                        }`}
                      >
                        <AccountIcon
                          color={isCash ? "#047857" : "#4f46e5"}
                          size={19}
                          strokeWidth={2.2}
                        />
                      </View>
                      <View className="ml-3 flex-1 pr-3">
                        <Text className="text-[14px] font-bold text-slate-900">
                          {item.partyName || `Untitled ${accountLabel}`}
                        </Text>
                        <Text className="mt-1 text-[12px] text-slate-500">
                          {getAccountDetails(item)}
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
                        ? `No matching ${accountLabel.toLowerCase()}s`
                        : `No ${accountLabel.toLowerCase()}s found`}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  accountsQuery.isFetchingNextPage ? (
                    <ActivityIndicator className="py-4" color="#134074" />
                  ) : null
                }
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
