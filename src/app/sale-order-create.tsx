import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import * as Crypto from "expo-crypto";
import { useNavigation, useRouter } from "expo-router";
import { toast } from "sonner-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { AdditionalChargesSection } from "@/components/sale-order-create/AdditionalChargesSection";
import { DespatchDetailsSection } from "@/components/sale-order-create/DespatchDetailsSection";
import { ProductSelectionModal } from "@/components/sale-order-create/ProductSelectionModal";
import { SaleOrderDespatchModal } from "@/components/sale-order-create/SaleOrderDespatchModal";
import { SaleOrderItemEditModal } from "@/components/sale-order-create/SaleOrderItemEditModal";
import { SaleOrderItemsSection } from "@/components/sale-order-create/SaleOrderItemsSection";
import { SaleOrderSummarySection } from "@/components/sale-order-create/SaleOrderSummarySection";
import { DiscardDraftSheet } from "@/components/voucher-create/DiscardDraftSheet";
import { VoucherCreateHeader } from "@/components/voucher-create/VoucherCreateHeader";
import { VoucherEmptyState } from "@/components/voucher-create/VoucherEmptyState";
import { VoucherErrorState } from "@/components/voucher-create/VoucherErrorState";
import { VoucherLoadingState } from "@/components/voucher-create/VoucherLoadingState";
import { VoucherPartyModal } from "@/components/voucher-create/VoucherPartyModal";
import { VoucherPartySelector } from "@/components/voucher-create/VoucherPartySelector";
import { VoucherSeriesModal } from "@/components/voucher-create/VoucherSeriesModal";
import { VoucherSeriesSelector } from "@/components/voucher-create/VoucherSeriesSelector";
import { VoucherSubmitFooter } from "@/components/voucher-create/VoucherSubmitFooter";
import {
  invalidateTodayTransactions,
  useVoucherSeriesListQuery,
  voucherSeriesQueryKeys,
  voucherTotalsSummaryQueryKeys,
} from "@/hooks/queries/voucherQueries";
import {
  buildCreateSaleOrderPayload,
  saleOrderService,
} from "@/services/saleOrder.service";
import {
  removeSaleOrderPendingSubmission,
  saveSaleOrderPendingSubmission,
  updateSaleOrderPendingSubmissionStatus,
} from "@/services/pendingSubmissions/saleOrderPendingSubmission.service";
import { subscribeToPendingSubmissionResolution } from "@/services/pendingSubmissions/pendingSubmissionResolutionEvents";
import {
  createVoucherOperationContext,
  isCurrentVoucherOperationContext,
  type VoucherOperationContext,
} from "@/services/voucherOperationContext";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  removeVoucherItem,
  resetVoucherDraft,
  clearVoucherSubmittedPayload,
  setVoucherAdditionalCharges,
  setVoucherDate,
  setVoucherDespatchDetails,
  setVoucherItems,
  setVoucherParty,
  setVoucherPriceLevel,
  setVoucherSeries,
  setVoucherSubmission,
  setVoucherSubmissionRecoveryState,
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

function getCreateErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error
    ? error.message
    : "Failed to create sale order";
}

function isVoucherContextActive(context: VoucherOperationContext): boolean {
  const currentState = store.getState();
  return isCurrentVoucherOperationContext(
    context,
    currentState.auth.user?._id,
    currentState.company.selectedCompany?._id,
  );
}

export default function SaleOrderCreateScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const userId = useAppSelector((state) => state.auth.user?._id ?? "");
  const voucherDraft = useAppSelector((state) => state.voucherDraft);
  const cmp_id = selectedCompany?._id ?? "";
  const frozenPayload = voucherDraft.submittedPayload;
  const isDraftLocked = frozenPayload !== null;
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isDespatchModalOpen, setIsDespatchModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState("");
  const isBackConfirmedRef = useRef(false);
  const discardDraftSheetRef = useRef<BottomSheetModal>(null);
  const pendingBackActionRef = useRef<(() => void) | null>(null);
  const editingItem =
    voucherDraft.items.find((item) => item.id === editingItemId) ?? null;
  // Blocks a second tap before React Query can render its pending state.
  const isSubmittingRef = useRef(false);

  const seriesQuery = useVoucherSeriesListQuery(
    cmp_id,
    "saleOrder",
    Boolean(cmp_id),
  );
  const series = useMemo(
    () => seriesQuery.data?.series ?? [],
    [seriesQuery.data],
  );
  const createSaleOrderMutation = useMutation({
    // Pending Sale Orders are retried only by a deliberate user action.
    retry: false,
    mutationFn: saleOrderService.createSaleOrder,
  });

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (isBackConfirmedRef.current) return;

      event.preventDefault();
      pendingBackActionRef.current = () => {
        isBackConfirmedRef.current = true;
        navigation.dispatch(event.data.action);
      };
      discardDraftSheetRef.current?.present();
    });
  }, [navigation]);

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
        requestId: Crypto.randomUUID(),
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
    if (!cmp_id || !draftMatchesScreen || !seriesQuery.isSuccess || isDraftLocked) {
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
  }, [cmp_id, dispatch, isDraftLocked, series, seriesQuery.isSuccess, voucherDraft]);

  useEffect(() => {
    const context = createVoucherOperationContext(userId, cmp_id);
    return subscribeToPendingSubmissionResolution((event) => {
      if (!isVoucherContextActive(context)) return;
      if (
        event.transactionType !== "sale_order" ||
        event.userId !== userId ||
        event.companyId !== cmp_id ||
        event.requestId !== frozenPayload?.request_id
      ) {
        return;
      }

      dispatch(resetVoucherDraft());
      toast.success("Sale Order was confirmed in the background.");
    });
  }, [cmp_id, dispatch, frozenPayload?.request_id, userId]);

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
        billedQty: item.actualQty + 1,
      }),
    );
  };

  const handleDecrementItem = (item: SaleOrderItem) => {
    dispatch(
      updateVoucherItem({
        ...item,
        actualQty: Math.max(item.actualQty - 1, 0),
        billedQty: Math.max(item.actualQty - 1, 0),
      }),
    );
  };

  const handleRemoveItem = (itemId: string) => {
    dispatch(removeVoucherItem(itemId));
    setEditingItemId("");
  };

  const markRecoverableCreateFailure = async (
    requestId: string,
    state: "uncertain" | "conflict",
    context: VoucherOperationContext,
  ) => {
    if (!isVoucherContextActive(context)) return;
    dispatch(setVoucherSubmissionRecoveryState(state));
    try {
      await updateSaleOrderPendingSubmissionStatus(
        userId,
        cmp_id,
        requestId,
        state,
      );
    } catch {
      if (isVoucherContextActive(context)) {
        toast.error(
          "Sale Order stays locked, but pending submission status could not be updated.",
        );
      }
    }
  };

  const submitFrozenSaleOrderPayload = async (
    payload: NonNullable<typeof frozenPayload>,
  ) => {
    const context = createVoucherOperationContext(userId, cmp_id);
    const requestId = payload.request_id;
    if (!requestId) {
      toast.error("Sale Order request ID is missing. Start a new Sale Order.");
      return;
    }

    try {
      // Every Create POST first has a durable exact-body retry record.
      await saveSaleOrderPendingSubmission({
        userId,
        companyId: cmp_id,
        payload,
        status: "uncertain",
      });
      if (!isVoucherContextActive(context)) return;
      dispatch(setVoucherSubmissionRecoveryState("submitting"));
    } catch {
      if (!isVoucherContextActive(context)) return;
      dispatch(setVoucherSubmissionRecoveryState("uncertain"));
      toast.error(
        "Sale Order was not sent because safe retry storage is unavailable.",
      );
      return;
    }

    try {
      const data = await createSaleOrderMutation.mutateAsync(payload);
      if (!isVoucherContextActive(context)) return;
      try {
        await removeSaleOrderPendingSubmission(userId, cmp_id, requestId);
      } catch {
        if (isVoucherContextActive(context)) {
          toast.error(
            "Sale Order was saved, but pending submission cleanup must be retried.",
          );
        }
      }

      if (!isVoucherContextActive(context)) {
        // Keep the immutable retry record when storage cleanup finishes after
        // this Sale Order's user or company context has changed.
        await saveSaleOrderPendingSubmission({
          userId,
          companyId: cmp_id,
          payload,
          status: "uncertain",
        }).catch(() => undefined);
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: voucherSeriesQueryKeys.list(cmp_id, "saleOrder"),
        }),
        queryClient.invalidateQueries({
          queryKey: ["vouchers", cmp_id, "saleOrder"],
        }),
        queryClient.invalidateQueries({ queryKey: ["daybook", cmp_id] }),
        invalidateTodayTransactions(queryClient, cmp_id),
        queryClient.invalidateQueries({
          queryKey: voucherTotalsSummaryQueryKeys.company(cmp_id),
        }),
      ]);

      if (!isVoucherContextActive(context)) return;

      const voucherNumber = data.data?.saleOrder?.voucher_number;
      toast.success(
        data.idempotent_replay
          ? voucherNumber
            ? `Sale Order ${voucherNumber} recovered successfully`
            : "Sale Order recovered successfully"
          : voucherNumber
            ? `Sale Order ${voucherNumber} created`
            : data.message || "Sale Order created",
      );
      dispatch(resetVoucherDraft());
      // A successful create is not an abandoned draft, so its redirect must
      // bypass the Back-only discard warning.
      isBackConfirmedRef.current = true;
      if (data.data?.saleOrder?._id) {
        router.replace({
          pathname: "/sale-order-detail",
          params: { id: data.data.saleOrder._id },
        });
      } else {
        router.replace({
          pathname: "/voucher-list",
          params: { voucherType: "saleOrder" },
        });
      }
    } catch (error) {
      if (!isVoucherContextActive(context)) return;
      const status = isAxiosError(error) ? error.response?.status : undefined;

      if (status === 409) {
        await markRecoverableCreateFailure(requestId, "conflict", context);
        if (!isVoucherContextActive(context)) return;
        toast.error(
          "This request ID belongs to a different Sale Order. Start a new Sale Order to continue.",
        );
        return;
      }

      const isDefinitiveClientFailure =
        status !== undefined &&
        status >= 400 &&
        status < 500 &&
        status !== 408 &&
        status !== 401 &&
        status !== 403;
      if (isDefinitiveClientFailure) {
        try {
          await removeSaleOrderPendingSubmission(userId, cmp_id, requestId);
        } catch {
          if (isVoucherContextActive(context)) {
            toast.error("Could not clear the local retry record.");
          }
        }
        if (!isVoucherContextActive(context)) return;
        dispatch(clearVoucherSubmittedPayload());
        toast.error(getCreateErrorMessage(error));
        return;
      }

      await markRecoverableCreateFailure(requestId, "uncertain", context);
      if (!isVoucherContextActive(context)) return;
      toast.error(
        "Unable to confirm whether the Sale Order was saved. Retry uses the same request.",
      );
    }
  };

  const handleCreateSaleOrder = async () => {
    if (isSubmittingRef.current || createSaleOrderMutation.isPending || !userId) {
      return;
    }

    isSubmittingRef.current = true;
    try {
      if (frozenPayload) {
        await submitFrozenSaleOrderPayload(frozenPayload);
        return;
      }

      if (!cmp_id) {
        toast.error("Select a company first");
        return;
      }
      if (!voucherDraft.selectedSeries) {
        toast.error("Select a sale-order voucher series");
        return;
      }
      if (!voucherDraft.transactionDate) {
        toast.error("Select a transaction date");
        return;
      }
      if (!voucherDraft.selectedParty) {
        toast.error("Select a customer");
        return;
      }
      if (voucherDraft.items.length === 0) {
        toast.error("Add at least one product");
        return;
      }
      if (!voucherDraft.requestId) {
        toast.error("Preparing a new Sale Order. Please try again.");
        return;
      }

      const payload = buildCreateSaleOrderPayload({
        companyId: cmp_id,
        requestId: voucherDraft.requestId,
        transactionDate: voucherDraft.transactionDate,
        selectedSeries: voucherDraft.selectedSeries,
        party: voucherDraft.selectedParty,
        taxType: voucherDraft.taxType,
        selectedPriceLevel: voucherDraft.selectedPriceLevel,
        despatchDetails: voucherDraft.despatchDetails,
        items: voucherDraft.items,
        itemTotals: voucherDraft.itemTotals,
        additionalCharges: voucherDraft.additionalCharges,
        additionalChargeTotals: voucherDraft.additionalChargeTotals,
      });
      dispatch(
        setVoucherSubmission({
          requestId: voucherDraft.requestId,
          submittedPayload: payload,
        }),
      );
      await submitFrozenSaleOrderPayload(payload);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const isCreateDisabled =
    !cmp_id ||
    !voucherDraft.selectedSeries ||
    !voucherDraft.transactionDate ||
    !voucherDraft.selectedParty ||
    voucherDraft.items.length === 0;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Create Order" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 148 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <VoucherCreateHeader
          title="Sale Order"
          description="Choose the transaction date and voucher number."
          transactionDate={voucherDraft.transactionDate}
          onTransactionDateChange={handleTransactionDateChange}
          isDateDisabled={!cmp_id || isDraftLocked}
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
              onPress={() => {
                if (!isDraftLocked) setIsSeriesModalOpen(true);
              }}
            />
          )}
        </VoucherCreateHeader>

        <View className="mt-4">
          <VoucherPartySelector
            selectedParty={voucherDraft.selectedParty}
            disabled={!cmp_id || isDraftLocked}
            onPress={() => setIsPartyModalOpen(true)}
          />
        </View>

        <View className="mt-4">
          <SaleOrderItemsSection
            items={voucherDraft.items}
            totals={voucherDraft.itemTotals}
            disabled={!voucherDraft.selectedParty || isDraftLocked}
            isItemEditorOpen={Boolean(editingItem)}
            onAddPress={() => setIsProductModalOpen(true)}
            onEdit={(item) => setEditingItemId(item.id)}
            onIncrement={handleIncrementItem}
            onDecrement={handleDecrementItem}
            onRemove={handleRemoveItem}
          />
        </View>

        <Text className="ml-1 mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Optional details
        </Text>

        <View className="mt-3">
          <DespatchDetailsSection
            details={voucherDraft.despatchDetails}
            disabled={!cmp_id || isDraftLocked}
            onPress={() => setIsDespatchModalOpen(true)}
          />
        </View>

        <View className="mt-3">
          <AdditionalChargesSection
            companyId={cmp_id}
            hasItems={voucherDraft.items.length > 0}
            taxType={voucherDraft.taxType}
            selectedCharges={voucherDraft.additionalCharges}
            totals={voucherDraft.additionalChargeTotals}
            disabled={isDraftLocked}
            onSave={(charges) =>
              dispatch(setVoucherAdditionalCharges(charges))
            }
          />
        </View>

        <View className="mt-6">
          <SaleOrderSummarySection
            itemTotals={voucherDraft.itemTotals}
            additionalChargeTotals={voucherDraft.additionalChargeTotals}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <VoucherSubmitFooter
        actionLabel={frozenPayload ? "Retry Sale Order" : "Create Sale Order"}
        pendingLabel="Creating..."
        summaryLabel="Final amount"
        summaryValue={voucherDraft.additionalChargeTotals.finalAmount.toFixed(2)}
        isSubmitting={createSaleOrderMutation.isPending}
        error={
          createSaleOrderMutation.error
            ? getCreateErrorMessage(createSaleOrderMutation.error)
            : ""
        }
        disabled={isCreateDisabled}
        onPress={handleCreateSaleOrder}
      />

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
      <DiscardDraftSheet
        sheetRef={discardDraftSheetRef}
        voucherLabel="Sale Order"
        onConfirm={() => pendingBackActionRef.current?.()}
      />
    </View>
  );
}
