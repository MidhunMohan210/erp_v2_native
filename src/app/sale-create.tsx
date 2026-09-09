import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { AdditionalChargesSection } from "@/components/sale-order-create/AdditionalChargesSection";
import { DespatchDetailsSection } from "@/components/sale-order-create/DespatchDetailsSection";
import { SaleOrderDespatchModal } from "@/components/sale-order-create/SaleOrderDespatchModal";
import { SaleItemsSection } from "@/components/sale-create/SaleItemsSection";
import { SaleNarrationSection } from "@/components/sale-create/SaleNarrationSection";
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
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useCreateSaleMutation } from "@/hooks/queries/saleQueries";
import {
  useVoucherSeriesListQuery,
  voucherSeriesQueryKeys,
} from "@/hooks/queries/voucherQueries";
import {
  buildSaleCreatePayload,
  getSaleDraftValidationError,
} from "@/services/sale.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  resetSaleDraft,
  removeSaleItem,
  setSaleDate,
  setSaleAdditionalCharges,
  setSaleDespatchDetails,
  setSaleItems,
  setSaleNarration,
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

function getCreateErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error ? error.message : "Failed to create sale";
}

export default function SaleCreateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const saleDraft = useAppSelector((state) => state.saleDraft);
  const companyId = selectedCompany?._id ?? "";
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDespatchModalOpen, setIsDespatchModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null);
  const createSaleMutation = useCreateSaleMutation();

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

  const handleCreateSale = async () => {
    if (createSaleMutation.isPending) return;

    const validationError = getSaleDraftValidationError(companyId, saleDraft);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedSeries = saleDraft.selectedSeries;
    if (!selectedSeries) return;

    const payload = buildSaleCreatePayload({
      ...saleDraft,
      selectedSeries,
    });

  console.log(
  "Creating sale with payload:",
  JSON.stringify(payload, null, 2)
);




    try {
      const response = await createSaleMutation.mutateAsync({
        companyId,
        payload,
      });
      await Promise.all([
        // Product rows contain stock balances, which changed on the server.
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products }),
        queryClient.invalidateQueries({
          queryKey: voucherSeriesQueryKeys.list(companyId, "sale"),
        }),
      ]);

      const voucherNumber = response.data?.sale?.voucher_number;
      toast.success(
        voucherNumber ? `Sale ${voucherNumber} created` : "Sale created",
      );
      dispatch(resetSaleDraft());
      setEditingItem(null);
      setIsProductModalOpen(false);
      setIsDespatchModalOpen(false);
      setIsPartyModalOpen(false);
      setIsSeriesModalOpen(false);
      const saleId = response.data?.sale?._id;
      // The audit endpoint and route are development-only. Release builds keep
      // the existing post-create path and never expose an Audit action.
      if (__DEV__ && saleId) {
        router.replace({ pathname: "/sale-transaction-audit", params: { saleId } });
      } else {
        // There is no Sale list/detail phase yet, so return to the existing home flow.
        router.replace("/(app)/home");
      }
    } catch (error) {
      // React Query preserves the failed mutation error and the Redux draft for retry.
      toast.error(getCreateErrorMessage(error));
    }
  };

  const isCreateDisabled =
    !companyId ||
    !saleDraft.selectedSeries ||
    !saleDraft.transactionDate ||
    !saleDraft.selectedParty ||
    saleDraft.items.length === 0;

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
          <DespatchDetailsSection
            details={saleDraft.despatchDetails}
            disabled={!companyId}
            onPress={() => setIsDespatchModalOpen(true)}
          />
        </View>

        <View className="mt-4">
          <SaleItemsSection
            items={saleDraft.items}
            totals={saleDraft.itemTotals}
            disabled={!companyId || !saleDraft.selectedParty}
            isItemEditorOpen={Boolean(editingItem)}
            onAddPress={() => setIsProductModalOpen(true)}
            onEdit={setEditingItem}
            onRemove={(itemId) => dispatch(removeSaleItem(itemId))}
          />
        </View>

        <View className="mt-4">
          <AdditionalChargesSection
            companyId={companyId}
            hasItems={saleDraft.items.length > 0}
            taxType={saleDraft.taxType}
            selectedCharges={saleDraft.additionalCharges}
            totals={saleDraft.additionalChargeTotals}
            onSave={(charges) => dispatch(setSaleAdditionalCharges(charges))}
          />
        </View>

        <View className="mt-4">
          <SaleNarrationSection
            value={saleDraft.narration}
            disabled={!companyId}
            onChangeText={(value) => dispatch(setSaleNarration(value))}
          />
        </View>

        <View className="mt-4">
          <SaleSummarySection
            totals={saleDraft.itemTotals}
            additionalChargeTotals={saleDraft.additionalChargeTotals}
            isCreating={createSaleMutation.isPending}
            createError={
              createSaleMutation.error
                ? getCreateErrorMessage(createSaleMutation.error)
                : ""
            }
            disabled={isCreateDisabled}
            onCreate={() => void handleCreateSale()}
          />
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

      <SaleOrderDespatchModal
        visible={isDespatchModalOpen}
        details={saleDraft.despatchDetails}
        onClose={() => setIsDespatchModalOpen(false)}
        onSave={(details) => {
          dispatch(setSaleDespatchDetails(details));
          setIsDespatchModalOpen(false);
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
