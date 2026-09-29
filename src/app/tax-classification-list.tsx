import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { isAxiosError } from "axios";
import { Plus, RefreshCw, Tags, Trash2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import DeleteConfirmSheet from "@/components/DeleteConfirmSheet";
import { PageError } from "@/components/feedback/PageError";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  useDeleteTaxClassificationMutation,
  useTaxClassificationListQuery,
} from "@/hooks/queries/taxClassificationQueries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAppSelector } from "@/store/hooks";
import type { TaxClassification } from "@/types/taxClassification";

function getTaxSummary(classification: TaxClassification) {
  if (classification.calculation_mode === "on_value") {
    return `${classification.on_value?.taxability_type ?? "Tax"} · IGST ${classification.on_value?.igst_rate ?? 0}%`;
  }

  return `${classification.rate_slabs.length} ${classification.rate_slabs.length === 1 ? "slab" : "slabs"}`;
}

function ClassificationSkeleton() {
  return (
    <View className="px-4 pt-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} className="mb-3 h-[104px] rounded-2xl bg-slate-100" />
      ))}
    </View>
  );
}

function ClassificationCard({
  classification,
  onPress,
  onDelete,
}: {
  classification: TaxClassification;
  onPress: () => void;
  onDelete: () => void;
}) {
  const isOnValue = classification.calculation_mode === "on_value";

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 active:bg-slate-50"
    >
      <View className="flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Tags color="#134074" size={20} strokeWidth={2.2} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-[16px] font-bold text-[#17203a]">
              {classification.hsn_code}
            </Text>
            <View className="rounded-full bg-slate-100 px-2.5 py-1">
              <Text className="text-[11px] font-bold text-[#134074]">
                {isOnValue ? "On Value" : "Item Rate"}
              </Text>
            </View>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              hitSlop={8}
              className="p-1"
              accessibilityLabel={`Delete HSN/SAC ${classification.hsn_code}`}
            >
              <Trash2 color="#e11d48" size={18} strokeWidth={2.2} />
            </Pressable>
          </View>
          {/* <Text numberOfLines={1} className="mt-1 text-[14px] text-slate-600">
            {classification.description}
          </Text>
          <Text className="mt-2 text-[13px] font-semibold text-slate-500">
            {getTaxSummary(classification)}
          </Text> */}
        </View>
      </View>
    </Pressable>
  );
}

export default function TaxClassificationListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const [searchText, setSearchText] = useState("");
  const search = useDebouncedValue(searchText.trim().toLowerCase(), 300);
  const classificationsQuery = useTaxClassificationListQuery(selectedCompany?._id ?? "");
  const deleteMutation = useDeleteTaxClassificationMutation();
  const [classificationToDelete, setClassificationToDelete] = useState<TaxClassification | null>(null);

  const classifications = useMemo(
    () =>
      (classificationsQuery.data ?? []).filter((classification) =>
        `${classification.hsn_code} ${classification.description}`.toLowerCase().includes(search),
      ),
    [classificationsQuery.data, search],
  );

  const requestDelete = (classification: TaxClassification) => {
    setClassificationToDelete(classification);
    deleteSheetRef.current?.present();
  };

  const confirmDelete = async () => {
    if (!selectedCompany?._id || !classificationToDelete) return;

    try {
      await deleteMutation.mutateAsync({
        cmp_id: selectedCompany._id,
        classificationId: classificationToDelete._id,
      });
      deleteSheetRef.current?.dismiss();
      setClassificationToDelete(null);
      toast.success("Tax classification deleted");
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to delete tax classification";
      toast.error(message);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title="Tax Classification"
        menuItems={[
          {
            label: "Refresh list",
            icon: RefreshCw,
            onPress: () => void classificationsQuery.refetch(),
          },
        ]}
        showSearch
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search HSN/SAC or description"
      />

      {isCompanyLoading ? (
        <ClassificationSkeleton />
      ) : !selectedCompany?._id ? (
        <View className="flex-1 px-4 pt-4">
          <Text className="rounded-2xl border border-dashed border-slate-300 px-5 py-7 text-center text-slate-500">
            Select a company first to manage tax classifications.
          </Text>
        </View>
      ) : classificationsQuery.isLoading ? (
        <ClassificationSkeleton />
      ) : classificationsQuery.isError ? (
        <PageError
          title="Could not load tax classifications"
          description="Please check the connection and try again."
          onRetry={() => void classificationsQuery.refetch()}
        />
      ) : (
        <FlatList
          data={classifications}
          keyExtractor={(item) => item._id}
          contentContainerClassName="px-4 pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 108, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={classificationsQuery.isRefetching}
              onRefresh={() => void classificationsQuery.refetch()}
              tintColor="#134074"
            />
          }
          renderItem={({ item }) => (
            <ClassificationCard
              classification={item}
              onPress={() =>
                router.push({ pathname: "/tax-classification-form", params: { id: item._id } })
              }
              onDelete={() => requestDelete(item)}
            />
          )}
          ListEmptyComponent={
            <View className="mt-12 items-center px-6">
              <Tags color="#94a3b8" size={38} />
              <Text className="mt-3 text-[18px] font-bold text-[#17203a]">
                {search ? "No matching classifications" : "No tax classifications yet"}
              </Text>
              <Text className="mt-1 text-center text-[14px] text-slate-500">
                {search ? "Try another HSN/SAC code or description." : "Add an HSN/SAC classification to get started."}
              </Text>
            </View>
          }
        />
      )}

      {selectedCompany?._id ? (
        <Pressable
          onPress={() => router.push("/tax-classification-form")}
          className="absolute bottom-6 right-5 flex-row items-center rounded-full bg-[#134074] px-5 py-3.5 shadow-lg shadow-slate-900/30"
        >
          {classificationsQuery.isFetching ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Plus color="#ffffff" size={20} strokeWidth={2.5} />
          )}
          <Text className="ml-2 text-[14px] font-bold text-white">Add</Text>
        </Pressable>
      ) : null}

      <DeleteConfirmSheet
        sheetRef={deleteSheetRef}
        title="Delete Tax Classification"
        description={
          classificationToDelete
            ? `Delete HSN/SAC ${classificationToDelete.hsn_code}? Products using this code will prevent deletion.`
            : "Delete this tax classification?"
        }
        onConfirm={() => void confirmDelete()}
        isLoading={deleteMutation.isPending}
      />
    </View>
  );
}
