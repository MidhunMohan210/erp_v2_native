import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
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
import {
  saleDetailQueryKeys,
  saleQueryKeys,
  useCreateSaleMutation,
  useSaleDetailQuery,
  useUpdateSaleMutation,
} from "@/hooks/queries/saleQueries";
import {
  useVoucherSeriesListQuery,
  voucherSeriesQueryKeys,
} from "@/hooks/queries/voucherQueries";
import {
  buildSaleCreatePayload,
  buildSaleUpdatePayload,
  getSaleCreatePayloadSignature,
  getSaleDraftValidationError,
} from "@/services/sale.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  resetSaleDraft,
  discardSaleEditDraft,
  loadSaleForEdit,
  removeSaleItem,
  setSaleDate,
  setSaleAdditionalCharges,
  setSaleDespatchDetails,
  setSaleItems,
  setSaleNarration,
  setSaleParty,
  setSalePriceLevel,
  setSaleSeries,
  setSaleSubmission,
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

function getUpdateErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error ? error.message : "Failed to update sale";
}

export default function SaleCreateScreen() {
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const saleDraft = useAppSelector((state) => state.saleDraft);
  const companyId = selectedCompany?._id ?? "";
  const saleId = params.id ?? "";
  // Passing an ID is enough to opt in, which also makes a manually opened
  // edit URL safe if its `mode` parameter was omitted.
  const isEditMode = params.mode === "edit" || Boolean(saleId);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDespatchModalOpen, setIsDespatchModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null);
  // React Query state updates after the event handler, so this also blocks two
  // taps that happen before `isPending` can update the button.
  const isSubmittingRef = useRef(false);
  const didSuccessfullyUpdateRef = useRef(false);
  const createSaleMutation = useCreateSaleMutation();
  const updateSaleMutation = useUpdateSaleMutation();
  const saleQuery = useSaleDetailQuery(saleId, companyId, isEditMode);

  const seriesQuery = useVoucherSeriesListQuery(
    companyId,
    "sale",
    Boolean(companyId) && !isEditMode,
  );
  const series = useMemo(
    () => seriesQuery.data?.series ?? [],
    [seriesQuery.data],
  );

  useEffect(() => {
    // A new route session must be treated as unfinished until its update succeeds.
    didSuccessfullyUpdateRef.current = false;
  }, [isEditMode, saleId]);

  const discardAbandonedEditDraft = useCallback(() => {
    if (
      !isEditMode ||
      !saleId ||
      didSuccessfullyUpdateRef.current
    ) {
      return;
    }

    // The reducer checks the current ID atomically, so a removed Sale A route
    // cannot clear an edit draft that Sale B has already loaded.
    dispatch(discardSaleEditDraft(saleId));
  }, [dispatch, isEditMode, saleId]);

  useEffect(() => {
    if (!isEditMode || !saleId) return;

    // This runs only when this route is removed (Back, a native gesture, or
    // another navigation action). It intentionally does not run on blur, so
    // future child Sale routes can keep the active edit draft.
    return navigation.addListener("beforeRemove", discardAbandonedEditDraft);
  }, [discardAbandonedEditDraft, isEditMode, navigation, saleId]);

  const handleScreenBack = () => {
    discardAbandonedEditDraft();
    router.back();
  };

  useEffect(() => {
    if (isEditMode) return;
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
  }, [companyId, dispatch, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !saleQuery.data || !companyId) return;
    dispatch(loadSaleForEdit({ companyId, sale: saleQuery.data }));
  }, [companyId, dispatch, isEditMode, saleQuery.data]);

  useEffect(() => {
    if (isEditMode) return;
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
  }, [companyId, dispatch, isEditMode, saleDraft.companyId, saleDraft.selectedSeries, series, seriesQuery.isSuccess]);

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
    if (isSubmittingRef.current || createSaleMutation.isPending) return;

    const validationError = getSaleDraftValidationError(companyId, saleDraft);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedSeries = saleDraft.selectedSeries;
    if (!selectedSeries) return;

    const requestId = saleDraft.request_id ?? Crypto.randomUUID();
    const payload = buildSaleCreatePayload({
      ...saleDraft,
      selectedSeries,
      request_id: requestId,
    });
    const payloadSignature = getSaleCreatePayloadSignature(payload);

    if (
      saleDraft.request_id &&
      saleDraft.submittedPayloadSignature !== payloadSignature
    ) {
      toast.error(
        "Sale details changed after an uncertain submission. Restore the previous values and retry, or check Daybook before starting a new Sale.",
      );
      return;
    }

    if (!saleDraft.request_id) {
      dispatch(
        setSaleSubmission({
          request_id: requestId,
          submittedPayloadSignature: payloadSignature,
        }),
      );
    }

    isSubmittingRef.current = true;
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
        // Today's Transactions and Daybook both read this voucher timeline.
        queryClient.invalidateQueries({
          queryKey: ["daybook", companyId],
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
      const createdSale = response.data?.sale;
      if (saleId && createdSale) {
        // There is no Sale GET-detail endpoint yet, so retain the server's
        // persisted response in React Query for the immediate detail route.
        queryClient.setQueryData(
          saleDetailQueryKeys.detail(companyId, saleId),
          createdSale,
        );
        router.replace({ pathname: "/sale-detail", params: { id: saleId } });
      } else {
        router.replace("/(app)/home");
      }
    } catch (error) {
      // React Query preserves the failed mutation error and the Redux draft for retry.
      toast.error(getCreateErrorMessage(error));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleUpdateSale = async () => {
    if (
      isSubmittingRef.current ||
      updateSaleMutation.isPending ||
      !saleId ||
      !companyId
    ) {
      return;
    }

    const validationError = getSaleDraftValidationError(
      companyId,
      saleDraft,
      false,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }

    isSubmittingRef.current = true;
    try {
      const response = await updateSaleMutation.mutateAsync({
        saleId,
        companyId,
        payload: buildSaleUpdatePayload(saleDraft),
      });
      const updatedSale = response.data?.sale;
      if (updatedSale) {
        queryClient.setQueryData(
          saleDetailQueryKeys.detail(companyId, saleId),
          updatedSale,
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: saleQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties }),
        queryClient.invalidateQueries({ queryKey: ["daybook", companyId] }),
        queryClient.invalidateQueries({
          queryKey: ["vouchers", companyId, "sale"],
        }),
      ]);
      toast.success(
        updatedSale?.voucher_number
          ? `Sale ${updatedSale.voucher_number} updated`
          : "Sale updated",
      );
      didSuccessfullyUpdateRef.current = true;
      dispatch(resetSaleDraft());
      router.replace({ pathname: "/sale-detail", params: { id: saleId } });
    } catch (error) {
      // Keep the loaded edit draft intact so backend errors can be corrected.
      toast.error(getUpdateErrorMessage(error));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const isSubmitDisabled =
    !companyId ||
    (!isEditMode && !saleDraft.selectedSeries) ||
    !saleDraft.transactionDate ||
    !saleDraft.selectedParty ||
    saleDraft.items.length === 0;

  if (isEditMode && (!saleId || !companyId)) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale" onBack={handleScreenBack} />
        <View className="flex-1 items-center justify-center px-6">
          <PageError
            title="Sale is not available"
            description="Open the Sale again from its detail screen."
            onRetry={handleScreenBack}
          />
        </View>
      </View>
    );
  }

  if (isEditMode && saleQuery.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale" onBack={handleScreenBack} />
        <PageLoader message="Loading sale..." />
      </View>
    );
  }

  if (isEditMode && (saleQuery.isError || !saleQuery.data)) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale" onBack={handleScreenBack} />
        <PageError
          title="Could not load sale"
          description="The Sale may be unavailable or you may not have access."
          onRetry={() => void saleQuery.refetch()}
        />
      </View>
    );
  }

  const loadedSale = saleQuery.data;

  if (
    isEditMode &&
    loadedSale &&
    (loadedSale.status === "cancelled" || loadedSale.tally_status !== "pending")
  ) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale" onBack={handleScreenBack} />
        <View className="flex-1 items-center justify-center px-6">
          <PageError
            title="This Sale cannot be edited"
            description={
              loadedSale.status === "cancelled"
                ? "Cancelled Sales cannot be changed."
                : "Only pending Sales can be edited."
            }
            onRetry={handleScreenBack}
          />
        </View>
      </View>
    );
  }

  const isEditDraftReady =
    !isEditMode ||
    (saleDraft.companyId === companyId && saleDraft.editingSaleId === saleId);

  if (!isEditDraftReady) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale" />
        <PageLoader message="Preparing sale..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title={isEditMode ? "Edit Sale" : "Create Sale"}
        onBack={isEditMode ? handleScreenBack : undefined}
      />

      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <VoucherCreateHeader
          title="Sale"
          description={
            isEditMode
              ? "Update the Sale details. Voucher identity cannot change."
              : "Choose the transaction date and voucher number."
          }
          transactionDate={saleDraft.transactionDate}
          onTransactionDateChange={(date) => dispatch(setSaleDate(date))}
          isDateDisabled={!companyId}
        >
          {isEditMode && saleDraft.selectedSeries ? (
            <VoucherSeriesSelector
              selectedSeries={saleDraft.selectedSeries}
              displayNumber={saleQuery.data?.voucher_number}
              disabled
              onPress={() => undefined}
            />
          ) : !companyId ? (
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
            isItemEditorOpen={Boolean(editingItem)}
            onAddPress={() => setIsProductModalOpen(true)}
            onEdit={setEditingItem}
            onRemove={(itemId) => dispatch(removeSaleItem(itemId))}
          />
        </View>

        <Text className="ml-1 mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Optional details
        </Text>

        <View className="mt-3">
          <DespatchDetailsSection
            details={saleDraft.despatchDetails}
            disabled={!companyId}
            onPress={() => setIsDespatchModalOpen(true)}
          />
        </View>

        <View className="mt-3">
          <AdditionalChargesSection
            companyId={companyId}
            hasItems={saleDraft.items.length > 0}
            taxType={saleDraft.taxType}
            selectedCharges={saleDraft.additionalCharges}
            totals={saleDraft.additionalChargeTotals}
            onSave={(charges) => dispatch(setSaleAdditionalCharges(charges))}
          />
        </View>

        <View className="mt-3">
          <SaleNarrationSection
            value={saleDraft.narration}
            disabled={!companyId}
            onChangeText={(value) => dispatch(setSaleNarration(value))}
          />
        </View>

        <View className="mt-6">
          <SaleSummarySection
            totals={saleDraft.itemTotals}
            additionalChargeTotals={saleDraft.additionalChargeTotals}
            isCreating={
              isEditMode
                ? updateSaleMutation.isPending
                : createSaleMutation.isPending
            }
            createError={
              isEditMode
                ? updateSaleMutation.error
                  ? getUpdateErrorMessage(updateSaleMutation.error)
                  : ""
                : createSaleMutation.error
                  ? getCreateErrorMessage(createSaleMutation.error)
                  : ""
            }
            disabled={isSubmitDisabled}
            mode={isEditMode ? "edit" : "create"}
            onCreate={() =>
              void (isEditMode ? handleUpdateSale() : handleCreateSale())
            }
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
        onCartChange={(items) => {
          dispatch(setSaleItems(items));
        }}
        onCartAddition={(items, priceLevel) => {
          if (priceLevel?._id !== saleDraft.selectedPriceLevel?._id) {
            dispatch(setSalePriceLevel(priceLevel));
          }
          dispatch(setSaleItems(items));
        }}
        preserveBilledQtyOnActualChange={isEditMode}
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
        preserveBilledQtyOnActualChange={isEditMode}
      />
    </View>
  );
}
