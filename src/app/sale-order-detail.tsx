import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Ban,
  Box,
  Calculator,
  ReceiptText,
  Pencil,
  Printer,
  Truck,
  UserRound,
} from "lucide-react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { PrintFormatSheet } from "@/components/saleOrderPrint/PrintFormatSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import { VoucherCancellationSheet } from "@/components/vouchers/VoucherCancellationSheet";
import { TallyProtectionNotice } from "@/components/vouchers/TallyProtectionNotice";
import {
  VoucherDetailCard,
  VoucherDetailHero,
  VoucherDetailMetric,
  VoucherDetailRow,
  VoucherProductCard,
} from "@/components/vouchers/VoucherDetailUI";
import {
  saleOrderQueryKeys,
  useSaleOrderDetailQuery,
} from "@/hooks/queries/saleOrderQueries";
import { invalidateTodayTransactions } from "@/hooks/queries/voucherQueries";
import { saleOrderService } from "@/services/saleOrder.service";
import { useAppSelector } from "@/store/hooks";
import type { SaleOrderPrintFormat } from "@/types/saleOrderPrint";
import {
  getBackendErrorMessage,
  getTallyModificationMessage,
  getTallyModificationState,
  isTallyAcceptedConflict,
} from "@/utils/tallyProtection";

function formatAmount(value?: number) {
  return `Rs. ${Number(value ?? 0).toFixed(2)}`;
}

function formatQuantity(value?: number) {
  return Number(value ?? 0).toString();
}

function formatPercent(value?: number) {
  return Number(value ?? 0).toString();
}

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCancellationErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }

  return error instanceof Error
    ? error.message
    : "Failed to cancel sale order";
}

export default function SaleOrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const cancellationSheetRef = useRef<BottomSheetModal>(null);
  const [isPrintFormatSheetVisible, setIsPrintFormatSheetVisible] =
    useState(false);
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const isCompanyLoading = useAppSelector(
    (state) => state.company.isLoading,
  );
  const saleOrderQuery = useSaleOrderDetailQuery(
    params.id ?? "",
    selectedCompany?._id ?? "",
    Boolean(params.id && selectedCompany?._id),
  );
  const saleOrderId = params.id ?? "";
  const companyId = selectedCompany?._id ?? "";
  const cancelSaleOrderMutation = useMutation({
    mutationFn: () =>
      saleOrderService.cancelSaleOrder(saleOrderId, {
        cmp_id: companyId,
      }),
    onSuccess: async (data) => {
      const cancelledSaleOrder = data.data?.saleOrder;

      if (cancelledSaleOrder) {
        queryClient.setQueryData(
          saleOrderQueryKeys.detail(saleOrderId, companyId),
          cancelledSaleOrder,
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

      cancellationSheetRef.current?.dismiss();
      toast.success(data.message || "Sale order cancelled");
    },
    onError: async (error) => {
      if (isTallyAcceptedConflict(error)) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: saleOrderQueryKeys.all }),
          queryClient.invalidateQueries({ queryKey: ["daybook", companyId] }),
        ]);
        await saleOrderQuery.refetch();
        cancellationSheetRef.current?.dismiss();
      }
      toast.error(getBackendErrorMessage(error, getCancellationErrorMessage(error)));
    },
  });

  if (isCompanyLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Sale Order Details" />
        <PageLoader message="Loading company..." />
      </View>
    );
  }

  if (!params.id || !selectedCompany?._id) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Sale Order" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[15px] font-bold text-slate-800">
            Sale order is not available
          </Text>
          <Text className="mt-2 text-center text-[12px] text-slate-500">
            Open the voucher again from Daybook or the sale-order list.
          </Text>
        </View>
      </View>
    );
  }

  if (saleOrderQuery.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Sale Order Details" />
        <PageLoader message="Loading sale order..." />
      </View>
    );
  }

  if (saleOrderQuery.isError || !saleOrderQuery.data) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Sale Order" />
        <PageError
          title="Could not load sale order"
          description="The voucher may be unavailable or you may not have access."
          onRetry={() => void saleOrderQuery.refetch()}
        />
      </View>
    );
  }

  const saleOrder = saleOrderQuery.data;
  const totals = saleOrder.totals;
  const party = saleOrder.party_snapshot;
  const despatch = saleOrder.despatch_details;
  const despatchRows = [
    ["Challan number", despatch.challan_no],
    ["Container number", despatch.container_no],
    ["Despatch through", despatch.despatch_through],
    ["Destination", despatch.destination],
    ["Vehicle number", despatch.vehicle_no],
    ["Order number", despatch.order_no],
    ["Payment terms", despatch.terms_of_pay],
    ["Delivery terms", despatch.terms_of_delivery],
  ].filter((row) => Boolean(row[1]));
  const editTallyState = getTallyModificationState(
    saleOrder.tally_ref,
    saleOrder.status === "open",
  );
  const cancelTallyState = getTallyModificationState(
    saleOrder.tally_ref,
    saleOrder.status === "open",
  );
  const handleEditSaleOrder = async () => {
    const latest = await saleOrderQuery.refetch();
    const state = getTallyModificationState(
      latest.data?.tally_ref,
      latest.data?.status === "open",
    );
    if (state !== "allowed") {
      toast.error(getTallyModificationMessage(state));
      return;
    }
    router.push({ pathname: "/sale-order-edit", params: { id: saleOrder._id } });
  };
  const handleCancelSaleOrder = async () => {
    if (cancelSaleOrderMutation.isPending) return;
    const latest = await saleOrderQuery.refetch();
    const state = getTallyModificationState(
      latest.data?.tally_ref,
      latest.data?.status === "open",
    );
    if (state !== "allowed") {
      toast.error(getTallyModificationMessage(state));
      return;
    }
    cancelSaleOrderMutation.mutate();
  };
  const handleContinueToPrintPreview = (format: SaleOrderPrintFormat) => {
    setIsPrintFormatSheetVisible(false);
    router.push({
      pathname: "/sale-order-print-preview",
      params: {
        id: saleOrder._id,
        format,
      },
    });
  };

  return (
    <View className="flex-1 bg-[#F5F7FB]">
      <ScreenHeader
        title="Sale Order Details"
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <VoucherDetailHero
          voucherType="Sale order"
          voucherNumber={saleOrder.voucher_number}
          status={saleOrder.status}
          statusTone={saleOrder.status === "cancelled" ? "cancelled" : saleOrder.status === "converted" ? "warning" : "active"}
          amount={formatAmount(totals.final_amount)}
          date={formatDate(saleOrder.date)}
          customer={party.name || "No customer"}
        />

        <View className="mb-4 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit sale order"
            disabled={editTallyState !== "allowed"}
            onPress={() => void handleEditSaleOrder()}
            className={`flex-1 items-center justify-center rounded-2xl border px-2 py-3 ${
              editTallyState === "allowed"
                ? "border-[#134074] bg-[#134074]"
                : "border-[#134074] bg-[#134074] opacity-45"
            }`}
          >
            <Pencil
              color="#ffffff"
              size={17}
              strokeWidth={2.2}
            />
            <Text
              className={`mt-1 text-center text-[11px] font-extrabold ${
                editTallyState === "allowed"
                  ? "text-white"
                  : "text-white"
              }`}
            >
              Edit
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel sale order"
            disabled={cancelTallyState !== "allowed"}
            onPress={() => cancellationSheetRef.current?.present()}
            className={`flex-1 items-center justify-center rounded-2xl border px-2 py-3 ${
              cancelTallyState === "allowed"
                ? "border-rose-200 bg-rose-50"
                : "border-rose-200 bg-rose-50 opacity-45"
            }`}
          >
            <Ban
              color="#be123c"
              size={17}
              strokeWidth={2.2}
            />
            <Text
              className={`mt-1 text-center text-[11px] font-extrabold ${
                cancelTallyState === "allowed"
                  ? "text-rose-700"
                  : "text-rose-700"
              }`}
            >
              Cancel
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Print sale order"
            onPress={() => setIsPrintFormatSheetVisible(true)}
            className="flex-1 items-center justify-center rounded-2xl border border-blue-100 bg-white px-2 py-3"
          >
            <Printer color="#134074" size={17} strokeWidth={2.2} />
            <Text className="mt-1 text-center text-[11px] font-extrabold text-[#134074]">
              Print / Export
            </Text>
          </Pressable>
        </View>
        {editTallyState === "accepted" ? (
          <TallyProtectionNotice />
        ) : editTallyState === "unverified" && saleOrder.status === "open" ? (
          <Text className="-mt-2 mb-4 text-center text-[12px] leading-5 text-slate-500">
            {getTallyModificationMessage("unverified")}
          </Text>
        ) : null}

        <View className="mb-4 flex-row gap-2">
          <VoucherDetailMetric label="Items" value={String(saleOrder.items.length)} />
          <VoucherDetailMetric label="Tax type" value={saleOrder.tax_type === "cgst_sgst" ? "CGST + SGST" : "IGST"} />
        </View>

        <VoucherDetailCard
          title="Customer"
          icon={<UserRound color="#2563eb" size={19} />}
          iconBackgroundClass="bg-blue-50"
        >
          <Text className="text-[15px] font-extrabold text-slate-900">
            {party.name || "--"}
          </Text>
          {party.mobile ? (
            <VoucherDetailRow label="Mobile" value={party.mobile} />
          ) : null}
          {party.gst_no ? (
            <VoucherDetailRow label="GSTIN" value={party.gst_no} />
          ) : null}
          {party.billing_address ? (
            <View className="mt-2 rounded-2xl bg-slate-50 p-3">
              <Text className="text-[10px] font-bold uppercase tracking-[0.7px] text-slate-400">Billing address</Text>
              <Text className="mt-1 text-[12px] leading-5 text-slate-700">{party.billing_address}</Text>
            </View>
          ) : null}
          {party.shipping_address ? (
            <View className="mt-2 rounded-2xl bg-slate-50 p-3">
              <Text className="text-[10px] font-bold uppercase tracking-[0.7px] text-slate-400">Shipping address</Text>
              <Text className="mt-1 text-[12px] leading-5 text-slate-700">{party.shipping_address}</Text>
            </View>
          ) : null}
          <VoucherDetailRow
            label="Tally status"
            value={saleOrder.tally_ref?.tally_status ?? "Unavailable"}
          />
        </VoucherDetailCard>

        <VoucherDetailCard
          title={`Products (${saleOrder.items.length})`}
          icon={<Box color="#0f766e" size={19} />}
          iconBackgroundClass="bg-teal-50"
        >
          {saleOrder.items.map((item, index) => (
            <View
              key={item._id}
              className={index > 0 ? "mt-2.5" : ""}
            >
              <VoucherProductCard
                name={item.item_name}
                amount={formatAmount(item.total_amount)}
                quantity={`Billed ${formatQuantity(item.billed_qty)} ${item.unit || ""} · Actual ${formatQuantity(item.actual_qty)}`}
              >
                  <Text className="text-[11px] leading-5 text-slate-600">
                    Rate {formatAmount(item.rate)} ·{" "}
                    {saleOrder.tax_type === "igst" ? "IGST" : "GST"} (
                    {formatPercent(item.tax_rate)}%)
                  </Text>
                  {item.cess_rate || item.addl_cess_rate ? (
                    <Text className="text-[11px] leading-5 text-slate-600">
                      {item.cess_rate
                        ? `Cess (${formatPercent(item.cess_rate)}%)`
                        : ""}
                      {item.cess_rate && item.addl_cess_rate ? " · " : ""}
                      {item.addl_cess_rate
                        ? `Addl. Cess (${formatPercent(item.addl_cess_rate)}%)`
                        : ""}
                    </Text>
                  ) : null}
                  {item.hsn || item.description ? (
                    <Text className="text-[11px] leading-5 text-slate-600">
                      {[item.hsn ? `HSN ${item.hsn}` : "", item.description]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
              </VoucherProductCard>
            </View>
          ))}
        </VoucherDetailCard>

        <VoucherDetailCard
          title="Additional charges"
          icon={<ReceiptText color="#b45309" size={19} />}
          iconBackgroundClass="bg-amber-50"
        >
          {saleOrder.additional_charges.length === 0 ? (
            <Text className="text-[12px] text-slate-500">
              No additional charges.
            </Text>
          ) : (
            saleOrder.additional_charges.map((charge, index) => {
              const taxRates = [
                charge.igst ? `IGST (${formatPercent(charge.igst)}%)` : "",
                charge.cgst ? `CGST (${formatPercent(charge.cgst)}%)` : "",
                charge.sgst ? `SGST (${formatPercent(charge.sgst)}%)` : "",
                charge.cess ? `Cess (${formatPercent(charge.cess)}%)` : "",
                charge.addl_cess
                  ? `Addl. Cess (${formatPercent(charge.addl_cess)}%)`
                  : "",
                charge.state_cess
                  ? `State Cess (${formatPercent(charge.state_cess)}%)`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <View
                  key={charge._id}
                  className={`flex-row items-start justify-between gap-3 ${
                    index > 0 ? "mt-3 border-t border-slate-100 pt-3" : ""
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-[12px] font-extrabold text-slate-900">
                      {charge.option}
                    </Text>
                    <Text className="mt-1 text-[11px] capitalize text-slate-500">
                      {charge.action}
                      {taxRates ? ` · ${taxRates}` : ""}
                    </Text>
                  </View>
                  <Text className="text-[12px] font-extrabold text-[#134074]">
                    {formatAmount(charge.final_value)}
                  </Text>
                </View>
              );
            })
          )}
        </VoucherDetailCard>

        <VoucherDetailCard
          title="Calculation summary"
          icon={<Calculator color="#4f46e5" size={19} />}
          iconBackgroundClass="bg-indigo-50"
        >
          <VoucherDetailRow label="Subtotal" value={formatAmount(totals.sub_total)} />
          <VoucherDetailRow
            label="Discount"
            value={formatAmount(totals.total_discount)}
          />
          <VoucherDetailRow
            label="Taxable amount"
            value={formatAmount(totals.taxable_amount)}
          />
          {totals.total_igst_amt ? (
            <VoucherDetailRow
              label="IGST"
              value={formatAmount(totals.total_igst_amt)}
            />
          ) : null}
          {totals.total_cgst_amt ? (
            <VoucherDetailRow
              label="CGST"
              value={formatAmount(totals.total_cgst_amt)}
            />
          ) : null}
          {totals.total_sgst_amt ? (
            <VoucherDetailRow
              label="SGST"
              value={formatAmount(totals.total_sgst_amt)}
            />
          ) : null}
          {totals.total_cess_amt ? (
            <VoucherDetailRow
              label="Cess"
              value={formatAmount(totals.total_cess_amt)}
            />
          ) : null}
          {totals.total_addl_cess_amt ? (
            <VoucherDetailRow
              label="Additional cess"
              value={formatAmount(totals.total_addl_cess_amt)}
            />
          ) : null}
          <VoucherDetailRow
            label="Tax amount"
            value={formatAmount(totals.total_tax_amount)}
          />
          <VoucherDetailRow
            label="Additional charges"
            value={formatAmount(totals.total_additional_charge)}
          />
          {totals.total_additional_charge_tax_amount ? (
            <VoucherDetailRow
              label="Additional-charge tax"
              value={formatAmount(totals.total_additional_charge_tax_amount)}
            />
          ) : null}
          {totals.total_additional_charge_igst_amt ? (
            <VoucherDetailRow
              label="Additional-charge IGST"
              value={formatAmount(totals.total_additional_charge_igst_amt)}
            />
          ) : null}
          {totals.total_additional_charge_cgst_amt ? (
            <VoucherDetailRow
              label="Additional-charge CGST"
              value={formatAmount(totals.total_additional_charge_cgst_amt)}
            />
          ) : null}
          {totals.total_additional_charge_sgst_amt ? (
            <VoucherDetailRow
              label="Additional-charge SGST"
              value={formatAmount(totals.total_additional_charge_sgst_amt)}
            />
          ) : null}
          {totals.total_additional_charge_cess_amt ? (
            <VoucherDetailRow
              label="Additional-charge cess"
              value={formatAmount(totals.total_additional_charge_cess_amt)}
            />
          ) : null}
          <View className="mt-2 border-t border-slate-200 pt-2">
            <VoucherDetailRow
              strong
              label="Final amount"
              value={formatAmount(totals.final_amount)}
            />
          </View>
        </VoucherDetailCard>

        <VoucherDetailCard
          title="Despatch details"
          icon={<Truck color="#0f766e" size={19} />}
          iconBackgroundClass="bg-teal-50"
        >
          {despatchRows.length === 0 ? (
            <Text className="text-[12px] text-slate-500">
              No despatch details.
            </Text>
          ) : (
            despatchRows.map(([label, value]) => (
              <VoucherDetailRow
                key={label}
                label={label ?? ""}
                value={value ?? "--"}
              />
            ))
          )}
        </VoucherDetailCard>
      </ScrollView>

      <VoucherCancellationSheet
        sheetRef={cancellationSheetRef}
        voucherLabel="sale order"
        voucherNumber={saleOrder.voucher_number}
        onConfirm={() => void handleCancelSaleOrder()}
        isLoading={cancelSaleOrderMutation.isPending}
      />

      <PrintFormatSheet
        visible={isPrintFormatSheetVisible}
        onClose={() => setIsPrintFormatSheetVisible(false)}
        onContinue={handleContinueToPrintPreview}
      />
    </View>
  );
}
