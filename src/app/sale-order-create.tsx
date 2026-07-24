import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { DespatchDetailsSection } from "@/components/sale-order-create/DespatchDetailsSection";
import { ProductSelectionModal } from "@/components/sale-order-create/ProductSelectionModal";
import { SaleOrderDespatchModal } from "@/components/sale-order-create/SaleOrderDespatchModal";
import { SaleOrderItemEditModal } from "@/components/sale-order-create/SaleOrderItemEditModal";
import { SaleOrderItemsSection } from "@/components/sale-order-create/SaleOrderItemsSection";
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
  removeVoucherItem,
  resetVoucherDraft,
  setVoucherDate,
  setVoucherDespatchDetails,
  setVoucherItems,
  setVoucherParty,
  setVoucherPriceLevel,
  setVoucherSeries,
  startVoucherDraft,
  updateVoucherItem,
} from "@/store/voucherDraftSlice";
import type { Party } from "@/types/party";
import type { PriceLevel } from "@/types/product";
import type {
  SaleOrderDespatchDetails,
  SaleOrderItem,
} from "@/types/saleOrder";
import type { VoucherSeriesItem } from "@/types/voucher";
import { getTodayDateString, resolveSaleTaxType } from "@/utils/voucher";

export default function SaleOrderCreateScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const voucherDraft = useAppSelector((state) => state.voucherDraft);
  const cmp_id = selectedCompany?._id ?? "";
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isDespatchModalOpen, setIsDespatchModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState("");
  const editingItem =
    voucherDraft.items.find((item) => item.id === editingItemId) ?? null;

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

  const handleTransactionDateChange = (nextDate: string) => {
    dispatch(setVoucherDate(nextDate));
  };

  const handleConfirmParty = (party: Party) => {
    dispatch(
      setVoucherParty({
        party,
        taxType: resolveSaleTaxType(selectedCompany?.state, party.state),
      }),
    );
    setIsPartyModalOpen(false);
  };

  const handleSaveDespatchDetails = (details: SaleOrderDespatchDetails) => {
    dispatch(setVoucherDespatchDetails(details));
    setIsDespatchModalOpen(false);
  };

  const handleConfirmProducts = (
    items: SaleOrderItem[],
    priceLevel: PriceLevel | null,
  ) => {
    dispatch(setVoucherPriceLevel(priceLevel));
    dispatch(setVoucherItems(items));
    setIsProductModalOpen(false);
  };

  const handleIncrementItem = (item: SaleOrderItem) => {
    dispatch(
      updateVoucherItem({
        ...item,
        actualQty: item.actualQty + 1,
        billedQty: item.billedQty + 1,
      }),
    );
  };

  const handleDecrementItem = (item: SaleOrderItem) => {
    dispatch(
      updateVoucherItem({
        ...item,
        actualQty: Math.max(item.actualQty - 1, 0),
        billedQty: Math.max(item.billedQty - 1, 0),
      }),
    );
  };

  const handleRemoveItem = (itemId: string) => {
    dispatch(removeVoucherItem(itemId));
    setEditingItemId("");
  };

  return (
    <View className="flex-1 bg-white/80">
      <ScreenHeader title="Create Order" />

      <ScrollView
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <VoucherCreateHeader
          title="Sale Order"
          description="Choose the transaction date and voucher number."
          transactionDate={voucherDraft.transactionDate}
          onTransactionDateChange={handleTransactionDateChange}
          isDateDisabled={!cmp_id}
        >
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
        </VoucherCreateHeader>

        <View className="mt-4">
          <VoucherPartySelector
            selectedParty={voucherDraft.selectedParty}
            disabled={!cmp_id}
            onPress={() => setIsPartyModalOpen(true)}
          />
        </View>

        <View className="mt-4">
          <DespatchDetailsSection
            details={voucherDraft.despatchDetails}
            disabled={!cmp_id}
            onPress={() => setIsDespatchModalOpen(true)}
          />
        </View>

        <View className="mt-4">
          <SaleOrderItemsSection
            items={voucherDraft.items}
            totals={voucherDraft.itemTotals}
            disabled={!voucherDraft.selectedParty}
            onAddPress={() => setIsProductModalOpen(true)}
            onEdit={(item) => setEditingItemId(item.id)}
            onIncrement={handleIncrementItem}
            onDecrement={handleDecrementItem}
            onRemove={handleRemoveItem}
          />
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

      <VoucherPartyModal
        visible={isPartyModalOpen}
        companyId={cmp_id}
        selectedParty={voucherDraft.selectedParty}
        onClose={() => setIsPartyModalOpen(false)}
        onConfirm={handleConfirmParty}
      />

      <SaleOrderDespatchModal
        visible={isDespatchModalOpen}
        details={voucherDraft.despatchDetails}
        onClose={() => setIsDespatchModalOpen(false)}
        onSave={handleSaveDespatchDetails}
      />

      <ProductSelectionModal
        visible={isProductModalOpen}
        companyId={cmp_id}
        partyId={voucherDraft.selectedParty?._id ?? ""}
        taxType={voucherDraft.taxType}
        selectedPriceLevel={voucherDraft.selectedPriceLevel}
        items={voucherDraft.items}
        onClose={() => setIsProductModalOpen(false)}
        onConfirm={handleConfirmProducts}
      />

      <SaleOrderItemEditModal
        visible={Boolean(editingItem)}
        item={editingItem}
        taxType={voucherDraft.taxType}
        onClose={() => setEditingItemId("")}
        onSave={(item) => dispatch(updateVoucherItem(item))}
        onRemove={handleRemoveItem}
      />
    </View>
  );
}
