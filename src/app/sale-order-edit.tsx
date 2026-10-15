import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AdditionalChargesSection } from "@/components/sale-order-create/AdditionalChargesSection";
import { DespatchDetailsSection } from "@/components/sale-order-create/DespatchDetailsSection";
import { ProductSelectionModal } from "@/components/sale-order-create/ProductSelectionModal";
import { SaleOrderDespatchModal } from "@/components/sale-order-create/SaleOrderDespatchModal";
import { SaleOrderItemEditModal } from "@/components/sale-order-create/SaleOrderItemEditModal";
import { SaleOrderItemsSection } from "@/components/sale-order-create/SaleOrderItemsSection";
import { SaleOrderSummarySection } from "@/components/sale-order-create/SaleOrderSummarySection";
import { VoucherCreateHeader } from "@/components/voucher-create/VoucherCreateHeader";
import { VoucherPartyModal } from "@/components/voucher-create/VoucherPartyModal";
import { VoucherPartySelector } from "@/components/voucher-create/VoucherPartySelector";
import { VoucherSeriesSelector } from "@/components/voucher-create/VoucherSeriesSelector";
import { VoucherSubmitFooter } from "@/components/voucher-create/VoucherSubmitFooter";
import {
  saleOrderQueryKeys,
  useSaleOrderDetailQuery,
} from "@/hooks/queries/saleOrderQueries";
import { invalidateTodayTransactions } from "@/hooks/queries/voucherQueries";
import {
  buildCreateSaleOrderPayload,
  saleOrderService,
} from "@/services/saleOrder.service";
import type { CreateSaleOrderPayload } from "@/services/saleOrder.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loadSaleOrderForEdit,
  removeVoucherItem,
  resetVoucherDraft,
  setVoucherAdditionalCharges,
  setVoucherDate,
  setVoucherDespatchDetails,
  setVoucherItems,
  setVoucherParty,
  setVoucherPriceLevel,
  updateVoucherItem,
} from "@/store/voucherDraftSlice";
import type { PriceLevel } from "@/types/product";
import type { Party } from "@/types/party";
import type {
  SaleOrderDespatchDetails,
  SaleOrderItem,
} from "@/types/saleOrder";
import { resolveSaleTaxType } from "@/utils/voucher";
import {
  getBackendErrorMessage,
  getTallyModificationMessage,
  getTallyModificationState,
  isTallyAcceptedConflict,
} from "@/utils/tallyProtection";

function getUpdateErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error
    ? error.message
    : "Failed to update sale order";
}

type UpdateSaleOrderInput = {
  id: string;
  payload: CreateSaleOrderPayload;
};

export default function SaleOrderEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const isCompanyLoading = useAppSelector(
    (state) => state.company.isLoading,
  );
  const voucherDraft = useAppSelector((state) => state.voucherDraft);
  const companyId = selectedCompany?._id ?? "";
  const saleOrderId = params.id ?? "";
  const [isDespatchModalOpen, setIsDespatchModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState("");
  const editingItem =
    voucherDraft.items.find((item) => item.id === editingItemId) ?? null;
  const saleOrderQuery = useSaleOrderDetailQuery(
    saleOrderId,
    companyId,
    Boolean(saleOrderId && companyId),
  );
  const saleOrder = saleOrderQuery.data;

  useEffect(() => {
    if (!saleOrder || !companyId || saleOrderQuery.isFetching) return;

    if (
      getTallyModificationState(saleOrder.tally_ref, saleOrder.status === "open") !==
      "allowed"
    ) {
      dispatch(resetVoucherDraft());
      return;
    }

    dispatch(loadSaleOrderForEdit({ companyId, saleOrder }));
  }, [companyId, dispatch, saleOrder, saleOrderQuery.isFetching]);

  useEffect(() => {
    // The edit draft is temporary and must not leak into another voucher flow.
    return () => {
      dispatch(resetVoucherDraft());
    };
  }, [dispatch]);

  const updateSaleOrderMutation = useMutation({
    mutationFn: ({ id, payload }: UpdateSaleOrderInput) =>
      saleOrderService.updateSaleOrder(id, payload),
    onSuccess: async (data) => {
      const updatedSaleOrder = data.data?.saleOrder;
      if (updatedSaleOrder) {
        queryClient.setQueryData(
          saleOrderQueryKeys.detail(saleOrderId, companyId),
          updatedSaleOrder,
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: saleOrderQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: ["vouchers", companyId, "saleOrder"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["daybook", companyId],
        }),
        invalidateTodayTransactions(queryClient, companyId),
      ]);

      toast.success(data.message || "Sale order updated");
      dispatch(resetVoucherDraft());
      router.replace({
        pathname: "/sale-order-detail",
        params: { id: saleOrderId },
      });
    },
    onError: async (error) => {
      if (isTallyAcceptedConflict(error)) {
        await Promise.all([
          saleOrderQuery.refetch(),
          queryClient.invalidateQueries({ queryKey: saleOrderQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: ["daybook", companyId] }),
        ]);
        dispatch(resetVoucherDraft());
        router.replace({ pathname: "/sale-order-detail", params: { id: saleOrderId } });
      }
      toast.error(getBackendErrorMessage(error, getUpdateErrorMessage(error)));
    },
  });

  const handleConfirmProducts = (
    items: SaleOrderItem[],
    priceLevel: PriceLevel | null,
  ) => {
    dispatch(setVoucherPriceLevel(priceLevel));
    dispatch(setVoucherItems(items));
    setIsProductModalOpen(false);
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

  const handleUpdateSaleOrder = () => {
    if (!saleOrderId || !companyId) {
      toast.error("Sale order is not available");
      return;
    }
    if (!voucherDraft.selectedSeries) {
      toast.error("The saved voucher series is not available");
      return;
    }
    if (!voucherDraft.transactionDate) {
      toast.error("Select a transaction date");
      return;
    }
    if (!voucherDraft.selectedParty?._id) {
      toast.error("The saved customer is not available");
      return;
    }
    if (voucherDraft.items.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    const selectedSeries = voucherDraft.selectedSeries;
    const selectedParty = voucherDraft.selectedParty;

    void saleOrderQuery.refetch().then((latest) => {
      const state = getTallyModificationState(
        latest.data?.tally_ref,
        latest.data?.status === "open",
      );
      if (state !== "allowed") {
        dispatch(resetVoucherDraft());
        toast.error(getTallyModificationMessage(state));
        router.replace({ pathname: "/sale-order-detail", params: { id: saleOrderId } });
        return;
      }

      // Updating mutable fields must keep the existing series and voucher identity.
      const payload = buildCreateSaleOrderPayload({
        companyId,
        transactionDate: voucherDraft.transactionDate,
        selectedSeries,
        party: selectedParty,
        taxType: voucherDraft.taxType,
        selectedPriceLevel: voucherDraft.selectedPriceLevel,
        despatchDetails: voucherDraft.despatchDetails,
        items: voucherDraft.items,
        itemTotals: voucherDraft.itemTotals,
        additionalCharges: voucherDraft.additionalCharges,
        additionalChargeTotals: voucherDraft.additionalChargeTotals,
      });

      updateSaleOrderMutation.mutate({
        id: saleOrderId,
        payload,
      });
    });
  };

  if (isCompanyLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale Order" />
        <PageLoader message="Loading company..." />
      </View>
    );
  }

  if (!saleOrderId || !companyId) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale Order" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[15px] font-bold text-slate-800">
            Sale order is not available
          </Text>
          <Text className="mt-2 text-center text-[12px] text-slate-500">
            Open the order again from its detail screen.
          </Text>
        </View>
      </View>
    );
  }

  if (saleOrderQuery.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale Order" />
        <PageLoader message="Loading sale order..." />
      </View>
    );
  }

  if (saleOrderQuery.isFetching) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale Order" />
        <PageLoader message="Verifying Tally acknowledgement..." />
      </View>
    );
  }

  if (saleOrderQuery.isError || !saleOrder) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale Order" />
        <PageError
          title="Could not load sale order"
          description="The voucher may be unavailable or you may not have access."
          onRetry={() => void saleOrderQuery.refetch()}
        />
      </View>
    );
  }

  if (
    getTallyModificationState(saleOrder.tally_ref, saleOrder.status === "open") !==
    "allowed"
  ) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale Order" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[15px] font-bold text-slate-800">
            {saleOrder.status !== "open"
              ? `Cannot edit a ${saleOrder.status} sale order.`
              : getTallyModificationMessage(
                  getTallyModificationState(saleOrder.tally_ref, true),
                )}
          </Text>
          <Text className="mt-2 text-center text-[12px] text-slate-500">
            Refresh the transaction to view its latest status.
          </Text>
        </View>
      </View>
    );
  }

  const isDraftReady =
    voucherDraft.companyId === companyId &&
    voucherDraft.voucherType === "saleOrder" &&
    voucherDraft.editingVoucherId === saleOrderId &&
    Boolean(voucherDraft.selectedParty);

  if (!isDraftReady) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Sale Order" />
        <PageLoader message="Preparing sale order..." />
      </View>
    );
  }

  const isUpdateDisabled =
    !voucherDraft.transactionDate ||
    !voucherDraft.selectedSeries?._id ||
    !voucherDraft.selectedParty?._id ||
    voucherDraft.items.length === 0;

  return (
    <View className="flex-1 bg-white/80">
      <ScreenHeader title="Edit Sale Order" />

      <ScrollView
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: 164 }}
        showsVerticalScrollIndicator={false}
      >
        <VoucherCreateHeader
          title="Sale Order"
          description="Update the date and order details."
          transactionDate={voucherDraft.transactionDate}
          onTransactionDateChange={(date) => dispatch(setVoucherDate(date))}
        >
          <VoucherSeriesSelector
            selectedSeries={voucherDraft.selectedSeries!}
            displayNumber={saleOrder.voucher_number}
            disabled
            onPress={() => undefined}
          />
        </VoucherCreateHeader>

        <View className="mt-4">
          <VoucherPartySelector
            selectedParty={voucherDraft.selectedParty}
            onPress={() => setIsPartyModalOpen(true)}
          />
        </View>

        <View className="mt-4">
          <DespatchDetailsSection
            details={voucherDraft.despatchDetails}
            onPress={() => setIsDespatchModalOpen(true)}
          />
        </View>

        <View className="mt-4">
          <SaleOrderItemsSection
            items={voucherDraft.items}
            totals={voucherDraft.itemTotals}
            isItemEditorOpen={Boolean(editingItem)}
            onAddPress={() => setIsProductModalOpen(true)}
            onEdit={(item) => setEditingItemId(item.id)}
            onIncrement={handleIncrementItem}
            onDecrement={handleDecrementItem}
            onRemove={handleRemoveItem}
          />
        </View>

        <View className="mt-4">
          <AdditionalChargesSection
            companyId={companyId}
            hasItems={voucherDraft.items.length > 0}
            taxType={voucherDraft.taxType}
            selectedCharges={voucherDraft.additionalCharges}
            totals={voucherDraft.additionalChargeTotals}
            onSave={(charges) =>
              dispatch(setVoucherAdditionalCharges(charges))
            }
          />
        </View>

        <View className="mt-4">
          <SaleOrderSummarySection
            itemTotals={voucherDraft.itemTotals}
            additionalChargeTotals={voucherDraft.additionalChargeTotals}
          />
        </View>
      </ScrollView>

      <VoucherSubmitFooter
        actionLabel="Update sale order"
        pendingLabel="Updating..."
        summaryLabel="Final amount"
        summaryValue={voucherDraft.additionalChargeTotals.finalAmount.toFixed(2)}
        isSubmitting={updateSaleOrderMutation.isPending}
        error={
          updateSaleOrderMutation.error
            ? getUpdateErrorMessage(updateSaleOrderMutation.error)
            : ""
        }
        disabled={isUpdateDisabled}
        onPress={handleUpdateSaleOrder}
      />

      <SaleOrderDespatchModal
        visible={isDespatchModalOpen}
        details={voucherDraft.despatchDetails}
        onClose={() => setIsDespatchModalOpen(false)}
        onSave={(details: SaleOrderDespatchDetails) => {
          dispatch(setVoucherDespatchDetails(details));
          setIsDespatchModalOpen(false);
        }}
      />

      <VoucherPartyModal
        visible={isPartyModalOpen}
        companyId={companyId}
        selectedParty={voucherDraft.selectedParty}
        onClose={() => setIsPartyModalOpen(false)}
        onConfirm={handleConfirmParty}
      />

      <ProductSelectionModal
        visible={isProductModalOpen}
        companyId={companyId}
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
