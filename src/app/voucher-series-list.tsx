import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Pencil, Rows3, Trash2 } from "lucide-react-native";

import DeleteConfirmSheet from "@/components/DeleteConfirmSheet";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SectionCard } from "@/components/vouchers/VoucherUi";
import {
  useVoucherSeriesListQuery,
  voucherSeriesQueryKeys,
} from "@/hooks/queries/voucherQueries";
import {
  formatVoucherSeriesNumber,
  voucherSeriesService,
} from "@/services/voucherSeries.service";
import { useAppSelector } from "@/store/hooks";
import type { VoucherType } from "@/types/voucher";
import { getVoucherTypeLabel } from "@/utils/voucher";

export default function VoucherSeriesListScreen() {
  const params = useLocalSearchParams<{ voucherType?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const voucherType =   params.voucherType as VoucherType || "saleOrder";

  console.log(params.voucherType);
  
  const [seriesToDelete, setSeriesToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const seriesQuery = useVoucherSeriesListQuery(
    selectedCompany?._id ?? "",
    voucherType,
    Boolean(selectedCompany?._id),
  );

  const series = useMemo(
    () => seriesQuery.data?.series ?? [],
    [seriesQuery.data],
  );

  const openEditForm = (seriesId: string) => {
    router.push({
      pathname: "/voucher-series-form",
      params: {
        voucherType,
        seriesId,
      },
    });
  };

  const requestDelete = (seriesId: string, seriesName: string) => {
    if (!selectedCompany?._id) {
      toast.error("Select a company first");
      return;
    }

    setSeriesToDelete({ id: seriesId, name: seriesName });
    deleteSheetRef.current?.present();
  };

  const handleDelete = async () => {
    if (!selectedCompany?._id || !seriesToDelete) {
      return;
    }

    try {
      setIsDeleting(true);

      await voucherSeriesService.deleteVoucherSeries({
        cmp_id: selectedCompany._id,
        seriesId: seriesToDelete.id,
        voucherType,
      });

      await queryClient.invalidateQueries({
        queryKey: voucherSeriesQueryKeys.list(selectedCompany._id, voucherType),
      });
      deleteSheetRef.current?.dismiss();
      toast.success("Series deleted");
      setSeriesToDelete(null);
    } catch (error) {
      deleteSheetRef.current?.dismiss();
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "Failed to delete series";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title={`${getVoucherTypeLabel(voucherType)} Series`}
        menuItems={[
          {
            label: "Add series",
            onPress: () =>
              router.push({
                pathname: "/voucher-series-form",
                params: { voucherType },
              }),
          },
        ]}
      />

      {isCompanyLoading ? (
        <PageLoader message="Loading company..." />
      ) : !selectedCompany?._id ? (
        <View className="px-4 pt-4">
          <SectionCard title="No company selected">
            <Text className="text-[14px] text-slate-500">
              Select a company first to manage voucher series.
            </Text>
          </SectionCard>
        </View>
      ) : seriesQuery.isLoading ? (
        <PageLoader message="Loading series..." />
      ) : seriesQuery.isError ? (
        <PageError
          title="Could not load series"
          description="Please check the connection and try again."
          onRetry={() => void seriesQuery.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          className="flex-1 px-4 pt-4"
        >
          <View>
            {series.length === 0 ? (
              <SectionCard
                title="No series found"
                description="Use the 3-dot menu to add the first series for this voucher type."
              />
            ) : (
              series.map((item) => (
                <View
                  key={item._id}
                  className="border-b border-slate-200 px-2 py-3.5"
                >
                  <View className="flex-row items-center">
                    <View className="h-[40px] w-[40px] items-center justify-center rounded-[14px] bg-blue-50">
                      <Rows3 color="#2457ff" size={20} strokeWidth={2.2} />
                    </View>

                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          numberOfLines={1}
                          className="flex-1 text-[16px] font-extrabold text-[#18233b]"
                        >
                          {item.seriesName || "Untitled Series"}
                        </Text>
                        {item.isDefault ? (
                          <View className="rounded-full bg-emerald-50 px-2.5 py-0.5">
                            <Text className="text-[11px] font-bold text-emerald-700">
                              Default
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text className="mt-0.5 text-[14px] font-medium text-slate-500">
                        {formatVoucherSeriesNumber(item)}
                      </Text>
                    </View>

                    <View className="ml-2 flex-row items-center gap-3">
                      <Pressable
                        hitSlop={10}
                        onPress={() => openEditForm(item._id)}
                        className="p-0.5"
                      >
                        <Pencil color="#475569" size={20} strokeWidth={2.1} />
                      </Pressable>

                      <Pressable
                        hitSlop={10}
                        onPress={() =>
                          requestDelete(
                            item._id,
                            item.seriesName || "this series",
                          )
                        }
                        disabled={item.isDefault || isDeleting}
                        className={`${item.isDefault || isDeleting ? "opacity-50" : ""} p-0.5`}
                      >
                        <Trash2 color="#ff4f7a" size={20} strokeWidth={2.1} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <DeleteConfirmSheet
        sheetRef={deleteSheetRef}
        title="Delete Series"
        description={
          seriesToDelete
            ? `${seriesToDelete.name} will be permanently removed.`
            : "This series will be permanently removed."
        }
        onConfirm={() => void handleDelete()}
        isLoading={isDeleting}
      />
    </View>
  );
}
