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
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Check, Search, Users, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  partyQueryKeys,
  useInfinitePartyListQuery,
} from "@/hooks/queries/partyQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { partyService } from "@/services/party.service";
import type { Party } from "@/types/party";

const PAGE_SIZE = 20;

type VoucherPartyModalProps = {
  visible: boolean;
  companyId: string;
  selectedParty: Party | null;
  onClose: () => void;
  onConfirm: (party: Party) => void;
};

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }

  return error instanceof Error
    ? error.message
    : "Unable to load customer details.";
}

export function VoucherPartyModal({
  visible,
  companyId,
  selectedParty,
  onClose,
  onConfirm,
}: VoucherPartyModalProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [loadingPartyId, setLoadingPartyId] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 500);

  const partiesQuery = useInfinitePartyListQuery({
    cmp_id: companyId,
    limit: PAGE_SIZE,
    search: debouncedSearchText,
    enabled: visible && Boolean(companyId),
  });
  const parties = useMemo(
    () => partiesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [partiesQuery.data],
  );

  useEffect(() => {
    if (!visible) {
      setSearchText("");
      setLoadingPartyId("");
      setSelectionError("");
    }
  }, [visible]);

  const handleLoadMore = () => {
    if (!partiesQuery.hasNextPage || partiesQuery.isFetchingNextPage) return;
    void partiesQuery.fetchNextPage();
  };

  const handleSelect = async (party: Party) => {
    if (!party._id || loadingPartyId) return;

    try {
      setLoadingPartyId(party._id);
      setSelectionError("");
      const fullParty = await queryClient.fetchQuery({
        queryKey: partyQueryKeys.detail(party._id),
        queryFn: ({ signal }) =>
          partyService.getPartyById(party._id, { signal }),
        staleTime: 30_000,
      });

      // The list carries balance fields that the detail response may omit.
      onConfirm({
        ...party,
        ...fullParty,
        totalOutstanding:
          fullParty.totalOutstanding ?? party.totalOutstanding ?? 0,
        classification:
          fullParty.classification ?? party.classification ?? "dr",
      });
    } catch (error) {
      setSelectionError(getErrorMessage(error));
    } finally {
      setLoadingPartyId("");
    }
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
          accessibilityLabel="Close customer selector"
          className="flex-1"
          onPress={onClose}
        />
        <View
          className="h-[80%] rounded-t-[28px] bg-white px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[18px] font-extrabold text-slate-900">
                Select customer
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                Search by customer name or contact details.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
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
              placeholder="Search customers"
              placeholderTextColor="#94a3b8"
              className="ml-3 flex-1 py-3.5 text-[14px] text-slate-900"
            />
          </View>

          {selectionError ? (
            <View className="mt-3 rounded-xl bg-rose-50 px-4 py-3">
              <Text className="text-[12px] text-rose-700">
                {selectionError}
              </Text>
            </View>
          ) : null}

          {partiesQuery.isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#134074" />
              <Text className="mt-3 text-[13px] text-slate-500">
                Loading customers...
              </Text>
            </View>
          ) : partiesQuery.isError ? (
            <View className="flex-1 items-center justify-center px-5">
              <Text className="text-center text-[13px] text-grey-700">
                Unable to load customers right now.
              </Text>
              <Pressable
                className="bg-blue-500 rounded-lg px-4 py-1 mt-3"
                onPress={() => void partiesQuery.refetch()}
              >
                <Text className="text-[13px] font-bold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              className="mt-3 flex-1"
              data={parties}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.4}
              renderItem={({ item }) => {
                const isSelected = item._id === selectedParty?._id;
                const isLoading = item._id === loadingPartyId;

                return (
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(loadingPartyId)}
                    onPress={() => void handleSelect(item)}
                    className={`mb-2 flex-row items-center rounded-2xl border px-4 py-4 ${
                      isSelected
                        ? "border-[#134074] bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <View className="flex-1 flex-row items-center gap-3 pr-3">
                      <View>
                        <Users color="#ca8a04" size={18} strokeWidth={2.1} />
                      </View>
                      <View>
                        <Text className="text-[14px] font-bold text-slate-900">
                          {item.partyName || "Untitled Customer"}
                        </Text>
                        <Text className="mt-1 text-[12px] text-slate-500">
                          {item.mobileNumber ||
                            item.emailID ||
                            "No contact details"}
                        </Text>
                      </View>
                    </View>
                    {isLoading ? (
                      <ActivityIndicator color="#134074" size="small" />
                    ) : isSelected ? (
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
                      ? "No matching customers"
                      : "No customers found"}
                  </Text>
                </View>
              }
              ListFooterComponent={
                partiesQuery.isFetchingNextPage ? (
                  <ActivityIndicator className="py-4" color="#134074" />
                ) : null
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
