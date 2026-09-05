import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SaleItemsSection } from "@/components/sale-create/SaleItemsSection";
import { SaleProductSelectionModal } from "@/components/sale-create/SaleProductSelectionModal";
import { SaleSummarySection } from "@/components/sale-create/SaleSummarySection";
import { SaleOrderItemEditModal } from "@/components/sale-order-create/SaleOrderItemEditModal";
import { VoucherCreateHeader } from "@/components/voucher-create/VoucherCreateHeader";
import { VoucherEmptyState } from "@/components/voucher-create/VoucherEmptyState";
import { VoucherErrorState } from "@/components/voucher-create/VoucherErrorState";
import { VoucherLoadingState } from "@/components/voucher-create/VoucherLoadingState";
import { VoucherPartyModal } from "@/components/voucher-create/VoucherPartyModal";
import { VoucherPartySelector } from "@/components/voucher-create/VoucherPartySelector";
import { VoucherSeriesModal } from "@/components/voucher-create/VoucherSeriesModal";
import { VoucherSeriesSelector } from "@/components/voucher-create/VoucherSeriesSelector";
import { useVoucherSeriesListQuery } from "@/hooks/queries/voucherQueries";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  resetSaleDraft,
  removeSaleItem,
  setSaleDate,
  setSaleItems,
  setSaleParty,
  setSalePriceLevel,
  setSaleSeries,
  startSaleDraft,
  updateSaleItem,
} from "@/store/saleDraftSlice";
import type { Party } from "@/types/party";
import type { SaleItem } from "@/types/sale";
import type { VoucherSeriesItem } from "@/types/voucher";
import { getTodayDateString, resolveSaleTaxType } from "@/utils/voucher";

export default function SaleCreateScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const saleDraft = useAppSelector((state) => state.saleDraft);
  const companyId = selectedCompany?._id ?? "";
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null);

  const seriesQuery = useVoucherSeriesListQuery(
    companyId,
    "sale",
    Boolean(companyId),
  );
  const series = useMemo(
    () => seriesQuery.data?.series ?? [],
    [seriesQuery.data],
  );

  useEffect(() => {
    if (!companyId) {
      dispatch(resetSaleDraft());
      return;
    }

    dispatch(
      startSaleDraft({
        companyId,
        transactionDate: getTodayDateString(),
      }),
    );

    // Child Sale routes can preserve this header later. Leaving this screen
    // discards unfinished values until draft persistence is an approved phase.
    return () => {
      dispatch(resetSaleDraft());
    };
  }, [companyId, dispatch]);

  useEffect(() => {
    const draftMatchesCompany = saleDraft.companyId === companyId;
    if (!companyId || !draftMatchesCompany || !seriesQuery.isSuccess) return;

    if (series.length === 0) {
      if (saleDraft.selectedSeries) {
        dispatch(setSaleSeries(null));
      }
      return;
    }

    const selectedStillExists = series.some(
      (item) => item._id === saleDraft.selectedSeries?._id,
    );
    if (selectedStillExists) return;

    const defaultSeries =
      series.find((item) => item.currentlySelected || item.isDefault) ??
      series[0];
    dispatch(setSaleSeries(defaultSeries));
  }, [companyId, dispatch, saleDraft.companyId, saleDraft.selectedSeries, series, seriesQuery.isSuccess]);

  const handleConfirmSeries = (nextSeries: VoucherSeriesItem) => {
    dispatch(setSaleSeries(nextSeries));
    setIsSeriesModalOpen(false);
  };

  const handleConfirmParty = (party: Party) => {
    dispatch(
      setSaleParty({
        party,
        taxType: resolveSaleTaxType(selectedCompany?.state, party.state),
      }),
    );
    setIsPartyModalOpen(false);
  };

  return (
    <View className="flex-1 bg-white/80">
      <ScreenHeader title="Create Sale" />

      <ScrollView
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <VoucherCreateHeader
          title="Sale"
          description="Choose the transaction date and voucher number."
          transactionDate={saleDraft.transactionDate}
          onTransactionDateChange={(date) => dispatch(setSaleDate(date))}
          isDateDisabled={!companyId}
        >
          {!companyId ? (
            <VoucherEmptyState message="Select a company first to load sale voucher series." />
          ) : seriesQuery.isLoading ? (
            <VoucherLoadingState message="Loading voucher series..." />
          ) : seriesQuery.isError ? (
            <VoucherErrorState
              message="Unable to load voucher series right now."
              onRetry={() => void seriesQuery.refetch()}
            />
          ) : !saleDraft.selectedSeries ? (
            <VoucherEmptyState message="No sale voucher series were found for this company." />
          ) : (
            <VoucherSeriesSelector
              selectedSeries={saleDraft.selectedSeries}
              onPress={() => setIsSeriesModalOpen(true)}
            />
          )}
        </VoucherCreateHeader>

        <View className="mt-4">
          <VoucherPartySelector
            selectedParty={saleDraft.selectedParty}
            disabled={!companyId}
            onPress={() => setIsPartyModalOpen(true)}
          />
        </View>

        <View className="mt-4">
          <SaleItemsSection
            items={saleDraft.items}
            totals={saleDraft.itemTotals}
            disabled={!companyId || !saleDraft.selectedParty}
            onAddPress={() => setIsProductModalOpen(true)}
            onEdit={setEditingItem}
            onRemove={(itemId) => dispatch(removeSaleItem(itemId))}
          />
        </View>

        <View className="mt-4">
          <SaleSummarySection totals={saleDraft.itemTotals} />
        </View>
      </ScrollView>

      {saleDraft.selectedSeries ? (
        <VoucherSeriesModal
          visible={isSeriesModalOpen}
          voucherLabel="Sale"
          series={series}
          selectedSeries={saleDraft.selectedSeries}
          onClose={() => setIsSeriesModalOpen(false)}
          onConfirm={handleConfirmSeries}
        />
      ) : null}

      <VoucherPartyModal
        visible={isPartyModalOpen}
        companyId={companyId}
        selectedParty={saleDraft.selectedParty}
        onClose={() => setIsPartyModalOpen(false)}
        onConfirm={handleConfirmParty}
      />

      <SaleProductSelectionModal
        visible={isProductModalOpen}
        companyId={companyId}
        partyId={saleDraft.selectedParty?._id ?? ""}
        taxType={saleDraft.taxType}
        items={saleDraft.items}
        selectedPriceLevel={saleDraft.selectedPriceLevel}
        onClose={() => setIsProductModalOpen(false)}
        onConfirm={(items, priceLevel) => {
          dispatch(setSalePriceLevel(priceLevel));
          dispatch(setSaleItems(items));
          setIsProductModalOpen(false);
        }}
      />

      <SaleOrderItemEditModal
        visible={Boolean(editingItem)}
        item={editingItem}
        taxType={saleDraft.taxType}
        onClose={() => setEditingItem(null)}
        onRemove={(itemId) => {
          dispatch(removeSaleItem(itemId));
          setEditingItem(null);
        }}
        onSave={(item) => dispatch(updateSaleItem(item as SaleItem))}
      />
    </View>
  );
}
