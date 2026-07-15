import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { isAxiosError } from "axios";
import { Pencil, Plus, RefreshCw, Trash2, Users } from "lucide-react-native";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import DeleteConfirmSheet from "@/components/DeleteConfirmSheet";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { PageError } from "@/components/feedback/PageError";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useInfinitePartyListQuery } from "@/hooks/queries/partyQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { partyService } from "@/services/party.service";
import { useAppSelector } from "@/store/hooks";
import type { Party } from "@/types/party";

const PAGE_SIZE = 20;

function CustomerRow({
  party,
  onOpen,
  onEdit,
  onDelete,
}: {
  party: Party;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const subtitle = party.mobileNumber || party.emailID || "No contact details";
  const isTallyParty = party.source === "tally";

  return (
    <View className="mb-3 flex-row items-center justify-between rounded-[14px] border-b border-slate-200 bg-slate-50 px-4 py-[14px] shadow-sm shadow-slate-900/10">
      <Pressable onPress={onOpen} className="flex-1 flex-row items-center">
        <View className="items-center justify-center rounded-[10px] bg-amber-100 p-2">
          <Users color="#ca8a04" size={22} strokeWidth={2.1} />
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              numberOfLines={1}
              className="shrink flex-1 text-[15px] font-extrabold text-[#0f172a]"
            >
              {party.partyName || "Untitled Customer"}
            </Text>
            {isTallyParty ? (
              <View className="rounded-full bg-amber-100 px-2.5 py-1">
                <Text className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">
                  Tally
                </Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} className="mt-0.5 text-sm text-slate-500">
            {subtitle}
          </Text>
        </View>
      </Pressable>

      {!isTallyParty ? (
        <View className="ml-3 flex-row items-center gap-3">
          <Pressable hitSlop={10} onPress={onEdit} className="p-1">
            <Pencil color="#475569" size={18} strokeWidth={2.1} />
          </Pressable>
          <Pressable hitSlop={10} onPress={onDelete} className="p-1">
            <Trash2 color="#ff4f7a" size={18} strokeWidth={2.1} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function CustomerSkeletonList() {
  return (
    <View className="px-4 pt-[14px]">
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={index}
          className="mb-3 h-[74px] rounded-[14px] border border-slate-200 bg-white"
        />
      ))}
    </View>
  );
}

export default function CustomerList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const [query, setQuery] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<Party | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const debouncedSearchText = useDebouncedValue(query.trim(), 500);

  const partiesQuery = useInfinitePartyListQuery({
    cmp_id: selectedCompany?._id ?? "",
    limit: PAGE_SIZE,
    search: debouncedSearchText,
  });

  const customers = useMemo(
    () => partiesQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [partiesQuery.data],
  );

  useEffect(() => {
    if (!partiesQuery.isError) {
      return;
    }

    const message =
      isAxiosError(partiesQuery.error) && partiesQuery.error.response?.data?.message
        ? partiesQuery.error.response.data.message
        : partiesQuery.error instanceof Error
          ? partiesQuery.error.message
          : "Failed to load customers";

    toast.error(message);
  }, [partiesQuery.error, partiesQuery.isError]);

  const handleLoadMore = () => {
    if (!partiesQuery.hasNextPage || partiesQuery.isFetchingNextPage) {
      return;
    }

    void partiesQuery.fetchNextPage();
  };

  const handleAddCustomer = () => {
    router.push("/customer-create");
  };

  const handleEditCustomer = (party: Party) => {
    if (party.source === "tally") {
      toast.error("Tally customers cannot be edited");
      return;
    }

    router.push({
      pathname: "/customer-create",
      params: { id: party._id },
    });
  };

  const handleAskDeleteCustomer = (party: Party) => {
    if (party.source === "tally") {
      toast.error("Tally customers cannot be deleted");
      return;
    }

    setCustomerToDelete(party);
    deleteSheetRef.current?.present();
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete?._id) {
      return;
    }

    try {
      setIsDeleting(true);
      const data = await partyService.deleteParty(customerToDelete._id);
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.parties,
        exact: false,
      });
      deleteSheetRef.current?.dismiss();
      toast.success(data?.message || "Customer deleted");
      setCustomerToDelete(null);
    } catch (error) {
      deleteSheetRef.current?.dismiss();
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "Failed to delete customer";

      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title="Customers"
        menuItems={[
          {
            label: "Add customer",
            icon: Plus,
            onPress: handleAddCustomer,
          },
          {
            label: "Refresh list",
            icon: RefreshCw,
            onPress: () => void partiesQuery.refetch(),
          },
        ]}
        showSearch
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search customers"
      />

      {isCompanyLoading ? (
        <CustomerSkeletonList />
      ) : !selectedCompany?._id ? (
        <View className="flex-1 px-4 pt-[14px]">
          <View className="rounded-[18px] border border-dashed border-slate-300 bg-white px-5 py-7">
            <Text className="text-center text-[14px] text-slate-500">
              Select a company first to view customers.
            </Text>
          </View>
        </View>
      ) : partiesQuery.isLoading ? (
        <CustomerSkeletonList />
      ) : partiesQuery.isError ? (
        <PageError
          title="Could not load customers"
          description="Please check the connection and try again."
          onRetry={() => void partiesQuery.refetch()}
        />
      ) : (
        <FlatList
          className="flex-1"
          contentContainerClassName="bg-white px-4 pt-[14px]"
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
          data={customers}
          keyExtractor={(item, index) => item._id || `${item.partyName || "customer"}-${index}`}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <CustomerRow
              party={item}
              onOpen={() => handleEditCustomer(item)}
              onEdit={() => handleEditCustomer(item)}
              onDelete={() => handleAskDeleteCustomer(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="mt-6 items-center rounded-[18px] bg-white px-5 py-7">
              <Text className="text-[18px] font-bold text-[#0f172a]">
                {debouncedSearchText ? "No matching customers" : "No customers found"}
              </Text>
              <Text className="mt-1.5 text-center text-[14px] text-slate-500">
                Try a different search term or refresh the list.
              </Text>
            </View>
          }
          ListFooterComponent={
            partiesQuery.isFetchingNextPage ? (
              <View className="items-center py-4">
                <ActivityIndicator color="#134074" size="small" />
                <Text className="mt-2 text-sm font-medium text-slate-700">
                  Loading more customers...
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <DeleteConfirmSheet
        sheetRef={deleteSheetRef}
        title="Delete Customer"
        description={
          customerToDelete
            ? `${customerToDelete.partyName || "This customer"} will be permanently removed.`
            : "This customer will be permanently removed."
        }
        onConfirm={() => void handleDeleteCustomer()}
        isLoading={isDeleting}
      />
    </View>
  );
}
