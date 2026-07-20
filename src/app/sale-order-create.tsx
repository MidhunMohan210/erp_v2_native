import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { FileText } from "lucide-react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { VoucherEmptyState } from "@/components/voucher-create/VoucherEmptyState";
import { VoucherErrorState } from "@/components/voucher-create/VoucherErrorState";
import { VoucherLoadingState } from "@/components/voucher-create/VoucherLoadingState";
import { VoucherSeriesModal } from "@/components/voucher-create/VoucherSeriesModal";
import { VoucherSeriesSelector } from "@/components/voucher-create/VoucherSeriesSelector";
import { useVoucherSeriesListQuery } from "@/hooks/queries/voucherQueries";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  resetVoucherDraft,
  setVoucherSeries,
  startVoucherDraft,
} from "@/store/voucherDraftSlice";
import type { VoucherSeriesItem } from "@/types/voucher";
import { getTodayDateString } from "@/utils/voucher";

export default function SaleOrderCreateScreen() {
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const voucherDraft = useAppSelector((state) => state.voucherDraft);
  const cmp_id = selectedCompany?._id ?? "";
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);

  const seriesQuery = useVoucherSeriesListQuery(
    cmp_id,
    "saleOrder",
    Boolean(cmp_id),
  );
  const series = useMemo(
    () => seriesQuery.data?.series ?? [],
    [seriesQuery.data],
  );

  useEffect(() => {
    if (!cmp_id) {
      dispatch(resetVoucherDraft());
      return;
    }

    dispatch(
      startVoucherDraft({
        voucherType: "saleOrder",
        companyId: cmp_id,
        transactionDate: getTodayDateString(),
      }),
    );

    // Child routes keep this screen mounted, so their navigation preserves the
    // draft. Removing this screen from the stack runs cleanup and discards it.
    return () => {
      dispatch(resetVoucherDraft());
    };
  }, [cmp_id, dispatch]);

  // This useEffect makes sure the selected voucher series is always valid.
  useEffect(() => {
    //This prevents another company’s or voucher type’s data from being used.
    const draftMatchesScreen =
      voucherDraft.companyId === cmp_id &&
      voucherDraft.voucherType === "saleOrder";

    // Stop when the data is not ready
    if (!cmp_id || !draftMatchesScreen || !seriesQuery.isSuccess) {
      return;
    }
    ////Suppose Redux currently has a selected series:But the fresh API returns:[]That means no series is currently available.
    // So Redux is cleared:

    if (series.length === 0) {
      if (voucherDraft.selectedSeries) {
        dispatch(setVoucherSeries(null));
      }
      return;
    }

    const selectedStillExists = series.some(
      (item) => item._id === voucherDraft.selectedSeries?._id,
    );
    if (selectedStillExists) return;

    // Prefer the API default; use the first series only when no default exists.
    const defaultSeries =
      series.find((item) => item.currentlySelected || item.isDefault) ??
      series[0];
    dispatch(setVoucherSeries(defaultSeries));
  }, [cmp_id, dispatch, series, seriesQuery.isSuccess, voucherDraft]);

  const handleConfirmSeries = (nextSeries: VoucherSeriesItem) => {
    dispatch(setVoucherSeries(nextSeries));
    setIsSeriesModalOpen(false);
  };

  return (
    <View className="flex-1 bg-white/80">
      <ScreenHeader title="Create Order" />

      <ScrollView
        className="flex-1 px-4 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-[22px] border border-slate-200 bg-white p-5">
          <View className="mb-5 flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
              <FileText color="#134074" size={22} strokeWidth={2.2} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[17px] font-extrabold text-slate-900">
                Sale Order
              </Text>
              <Text className="mt-0.5 text-[12px] text-slate-500">
                Start by selecting the voucher number.
              </Text>
            </View>
          </View>

          {!cmp_id ? (
            <VoucherEmptyState message="Select a company first to load sale order voucher series." />
          ) : seriesQuery.isLoading ? (
            <VoucherLoadingState message="Loading voucher series..." />
          ) : seriesQuery.isError ? (
            <VoucherErrorState
              message="Unable to load voucher series right now."
              onRetry={() => void seriesQuery.refetch()}
            />
          ) : !voucherDraft.selectedSeries ? (
            <VoucherEmptyState message="No sale order voucher series were found for this company." />
          ) : (
            <VoucherSeriesSelector
              selectedSeries={voucherDraft.selectedSeries}
              onPress={() => setIsSeriesModalOpen(true)}
            />
          )}
        </View>
      </ScrollView>

      {voucherDraft.selectedSeries ? (
        <VoucherSeriesModal
          visible={isSeriesModalOpen}
          voucherLabel="Sale Order"
          series={series}
          selectedSeries={voucherDraft.selectedSeries}
          onClose={() => setIsSeriesModalOpen(false)}
          onConfirm={handleConfirmSeries}
        />
      ) : null}
    </View>
  );
}
