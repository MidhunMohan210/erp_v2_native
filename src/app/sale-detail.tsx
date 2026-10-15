import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Ban,
  Box,
  Calculator,
  Pencil,
  Printer,
  ReceiptText,
  Truck,
  UserRound,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PrintFormatSheet } from "@/components/saleOrderPrint/PrintFormatSheet";
import { VoucherCancellationSheet } from "@/components/vouchers/VoucherCancellationSheet";
import { TallyProtectionNotice } from "@/components/vouchers/TallyProtectionNotice";
import {
  VoucherDetailCard,
  VoucherDetailHero,
  VoucherDetailMetric,
  VoucherDetailRow,
  VoucherProductCard,
} from "@/components/vouchers/VoucherDetailUI";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  saleDetailQueryKeys,
  saleQueryKeys,
  useCancelSaleMutation,
  useSaleDetailQuery,
} from "@/hooks/queries/saleQueries";
import { invalidateTodayTransactions } from "@/hooks/queries/voucherQueries";
import { useAppSelector } from "@/store/hooks";
import type { SaleOrderPrintFormat } from "@/types/saleOrderPrint";
import {
  getBackendErrorMessage,
  getTallyModificationMessage,
  getTallyModificationState,
  isTallyAcceptedConflict,
} from "@/utils/tallyProtection";

function formatAmount(value?: number | null) {
  return `Rs. ${Number(value ?? 0).toFixed(2)}`;
}
function formatQuantity(value?: number | null) {
  return Number(value ?? 0).toString();
}
function formatPercent(value?: number | null) {
  return Number(value ?? 0).toString();
}
function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "--"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function DisabledAction({
  label,
  icon,
  tone,
}: {
  label: string;
  icon: ReactNode;
  tone: "primary" | "danger";
}) {
  const isPrimary = tone === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} sale`}
      disabled
      className={`flex-1 items-center justify-center rounded-2xl border px-2 py-3 opacity-45 ${
        isPrimary
          ? "border-[#134074] bg-[#134074]"
          : "border-rose-200 bg-rose-50"
      }`}
    >
      {icon}
      <Text
        className={`mt-1 text-center text-[11px] font-extrabold ${
          isPrimary ? "text-white" : "text-rose-700"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function getCancellationErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error ? error.message : "Failed to cancel sale";
}

export default function SaleDetailScreen() {
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
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const saleId = params.id ?? "";
  const companyId = selectedCompany?._id ?? "";
  const saleQuery = useSaleDetailQuery(saleId, companyId);
  const cancelSaleMutation = useCancelSaleMutation();

  if (isCompanyLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Sale Details" />
        <PageLoader message="Loading company..." />
      </View>
    );
  }

  if (!saleId || !companyId) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Sale Details" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[15px] font-bold text-slate-800">
            Sale is not available
          </Text>
          <Text className="mt-2 text-center text-[12px] text-slate-500">
            Select a company and open the Sale again from Daybook.
          </Text>
        </View>
      </View>
    );
  }

  if (saleQuery.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Sale Details" />
        <PageLoader message="Loading sale..." />
      </View>
    );
  }

  if (saleQuery.isError || !saleQuery.data) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Sale Details" />
        <PageError
          title="Could not load sale"
          description="The Sale may be unavailable or you may not have access."
          onRetry={() => void saleQuery.refetch()}
        />
      </View>
    );
  }

  const sale = saleQuery.data;

  const party = sale.party_snapshot;
  const totals = sale.totals;
  const allDespatchRows: [string, string | null | undefined][] = [
    ["Challan number", sale.despatch_details.challan_no],
    ["Container number", sale.despatch_details.container_no],
    ["Despatch through", sale.despatch_details.despatch_through],
    ["Destination", sale.despatch_details.destination],
    ["Vehicle number", sale.despatch_details.vehicle_no],
    ["Order number", sale.despatch_details.order_no],
    ["Payment terms", sale.despatch_details.terms_of_pay],
    ["Delivery terms", sale.despatch_details.terms_of_delivery],
  ];
  const despatchRows = allDespatchRows.filter(([, value]) => Boolean(value));
  const isCancelled = sale.status === "cancelled";
  const editTallyState = getTallyModificationState(
    sale.tally_ref,
    sale.status !== "cancelled",
  );
  const cancelTallyState = getTallyModificationState(
    sale.tally_ref,
    sale.status === "active",
  );
  const canEdit = editTallyState === "allowed";
  const canCancel = cancelTallyState === "allowed";
  const refreshTransactionQueries = async () => {
    await Promise.all([
      saleQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["daybook", companyId] }),
    ]);
  };
  const handleEditSale = async () => {
    if (!canEdit) {
      if (!isCancelled) toast.error(getTallyModificationMessage(editTallyState));
      return;
    }
    const latest = await saleQuery.refetch();
    const latestState = getTallyModificationState(
      latest.data?.tally_ref,
      latest.data?.status !== "cancelled",
    );
    if (latestState !== "allowed") {
      toast.error(getTallyModificationMessage(latestState));
      return;
    }
    router.push({
      pathname: "/sale-create",
      params: { id: saleId, mode: "edit" },
    });
  };
  const handleCancelSale = async () => {
    if (cancelSaleMutation.isPending) return;
    const latest = await saleQuery.refetch();
    const latestSale = latest.data;
    const latestState = getTallyModificationState(
      latestSale?.tally_ref,
      latestSale?.status === "active",
    );
    if (latestState !== "allowed") {
      toast.error(getTallyModificationMessage(latestState));
      return;
    }
    cancelSaleMutation.mutate(
      { saleId, companyId },
      {
        onSuccess: async (data) => {
          const cancelledSale = data.data?.sale;
          if (cancelledSale) {
            queryClient.setQueryData(
              saleDetailQueryKeys.detail(companyId, saleId),
              cancelledSale,
            );
          }
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: saleQueryKeys.all }),
            queryClient.invalidateQueries({ queryKey: ["daybook", companyId] }),
            invalidateTodayTransactions(queryClient, companyId),
            queryClient.invalidateQueries({
              queryKey: ["vouchers", companyId, "sale"],
            }),
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties }),
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.outstanding }),
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cashBank }),
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products }),
          ]);
          cancellationSheetRef.current?.dismiss();
          toast.success(data.message || "Sale cancelled");
        },
        onError: async (error) => {
          if (isTallyAcceptedConflict(error)) {
            await refreshTransactionQueries();
            cancellationSheetRef.current?.dismiss();
          }
          toast.error(getBackendErrorMessage(error, getCancellationErrorMessage(error)));
        },
      },
    );
  };
  const handleContinueToPrintPreview = (format: SaleOrderPrintFormat) => {
    setIsPrintFormatSheetVisible(false);
    router.push({
      pathname: "/sale-order-print-preview",
      params: { id: sale._id, format, voucherType: "sale" },
    });
  };

  return (
    <View className="flex-1 bg-[#F5F7FB]">
      <ScreenHeader title="Sale Details" />
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
          voucherType="Sale"
          voucherNumber={sale.voucher_number}
          status={sale.status}
          statusTone={isCancelled ? "cancelled" : "active"}
          amount={formatAmount(totals.final_amount)}
          date={formatDate(sale.date)}
          customer={party.name || "No customer"}
        />

        <View className="mb-4 flex-row gap-2">
          {canEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit sale"
              onPress={() => void handleEditSale()}
              className="flex-1 items-center justify-center rounded-2xl bg-[#134074] px-2 py-3"
            >
              <Pencil color="#ffffff" size={17} strokeWidth={2.2} />
              <Text className="mt-1 text-center text-[11px] font-extrabold text-white">
                Edit
              </Text>
            </Pressable>
          ) : (
            <DisabledAction
              label="Edit"
              tone="primary"
              icon={<Pencil color="#ffffff" size={17} />}
            />
          )}
          {canCancel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel sale"
              disabled={cancelSaleMutation.isPending}
              onPress={() => cancellationSheetRef.current?.present()}
              className={`flex-1 items-center justify-center rounded-2xl border px-2 py-3 ${cancelSaleMutation.isPending ? "border-rose-200 bg-rose-100" : "border-rose-200 bg-rose-50"}`}
            >
              <Ban color="#e11d48" size={17} />
              <Text className="mt-1 text-center text-[11px] font-extrabold text-rose-700">
                Cancel
              </Text>
            </Pressable>
          ) : (
            <DisabledAction
              label="Cancel"
              tone="danger"
              icon={<Ban color="#e11d48" size={17} />}
            />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Print sale"
            onPress={() => setIsPrintFormatSheetVisible(true)}
            className="flex-1 items-center justify-center rounded-2xl border border-blue-100 bg-white px-2 py-3"
          >
            <Printer color="#134074" size={17} strokeWidth={2.2} />
            <Text className="mt-1 text-center text-[11px] font-extrabold text-[#134074]">
              Print / Export
            </Text>
          </Pressable>
        </View>
        {editTallyState === "accepted" || cancelTallyState === "accepted" ? (
          <TallyProtectionNotice />
        ) : editTallyState === "unverified" && !isCancelled ? (
          <Text className="-mt-2 mb-4 text-center text-[12px] leading-5 text-slate-500">
            {getTallyModificationMessage("unverified")}
          </Text>
        ) : null}
        <View className="mb-4 flex-row gap-2">
          <VoucherDetailMetric
            label="Items"
            value={String(sale.items.length)}
          />
          <VoucherDetailMetric
            label="Tax type"
            value={sale.tax_type === "cgst_sgst" ? "CGST + SGST" : "IGST"}
          />
        </View>

        <VoucherDetailCard
          title="Customer"
          icon={<UserRound color="#2563eb" size={19} />}
          iconBackgroundClass="bg-blue-50"
        >
          <Text className="text-[15px] font-extrabold text-slate-900">
            {party.name || "--"}
          </Text>
          {sale.mailing_name ? (
            <VoucherDetailRow label="Mailing name" value={sale.mailing_name} />
          ) : null}
          {party.mobile ? (
            <VoucherDetailRow label="Mobile" value={party.mobile} />
          ) : null}
          {party.gst_no ? (
            <VoucherDetailRow label="GSTIN" value={party.gst_no} />
          ) : null}
          {party.billing_address ? (
            <View className="mt-2 rounded-2xl bg-slate-50 p-3">
              <Text className="text-[10px] font-bold uppercase tracking-[0.7px] text-slate-400">
                Billing address
              </Text>
              <Text className="mt-1 text-[12px] leading-5 text-slate-700">
                {party.billing_address}
              </Text>
            </View>
          ) : null}
          {sale.series_name ? (
            <VoucherDetailRow label="Series" value={sale.series_name} />
          ) : null}
          <VoucherDetailRow
            label="Tally status"
            value={sale.tally_ref?.tally_status ?? "Unavailable"}
          />
        </VoucherDetailCard>

        <VoucherDetailCard
          title={`Products (${sale.items.length})`}
          icon={<Box color="#0f766e" size={19} />}
          iconBackgroundClass="bg-teal-50"
        >
          {sale.items.map((item, index) => (
            <View key={item._id} className={index > 0 ? "mt-2.5" : ""}>
              <VoucherProductCard
                name={item.item_name}
                amount={formatAmount(item.total_amount)}
                quantity={`Billed ${formatQuantity(item.billed_qty)} ${item.selected_unit || item.unit || ""} · Actual ${formatQuantity(item.actual_qty)}`}
              >
                <Text className="text-[11px] leading-5 text-slate-600">
                  Rate {formatAmount(item.rate)} ·{" "}
                  {sale.tax_type === "igst" ? "IGST" : "GST"} (
                  {formatPercent(item.tax_rate)}%)
                </Text>
                <Text className="text-[11px] leading-5 text-slate-600">
                  Godown: {item.godown_name}
                </Text>
                {item.batch ? (
                  <Text className="text-[11px] leading-5 text-slate-600">
                    Batch: {item.batch}
                  </Text>
                ) : null}
                {item.mrp != null ? (
                  <Text className="text-[11px] leading-5 text-slate-600">
                    MRP: {formatAmount(item.mrp)}
                  </Text>
                ) : null}
                {item.mfgdt || item.expdt ? (
                  <Text className="text-[11px] leading-5 text-slate-600">
                    {item.mfgdt ? `Mfg: ${formatDate(item.mfgdt)}` : ""}
                    {item.mfgdt && item.expdt ? " · " : ""}
                    {item.expdt ? `Exp: ${formatDate(item.expdt)}` : ""}
                  </Text>
                ) : null}
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

        {sale.additional_charges.length > 0 ? (
          <VoucherDetailCard
            title="Additional charges"
            icon={<ReceiptText color="#b45309" size={19} />}
            iconBackgroundClass="bg-amber-50"
          >
            {sale.additional_charges.map((charge, index) => (
              <View
                key={charge._id}
                className={`flex-row items-start justify-between gap-3 ${index > 0 ? "mt-3 border-t border-slate-100 pt-3" : ""}`}
              >
                <View className="flex-1">
                  <Text className="text-[12px] font-extrabold text-slate-900">
                    {charge.option}
                  </Text>
                  <Text className="mt-1 text-[11px] capitalize text-slate-500">
                    {charge.action}
                  </Text>
                </View>
                <Text
                  className={`text-[12px] font-extrabold ${charge.action === "subtract" ? "text-rose-700" : "text-[#134074]"}`}
                >
                  {charge.action === "subtract" ? "−" : "+"}
                  {formatAmount(charge.final_value)}
                </Text>
              </View>
            ))}
          </VoucherDetailCard>
        ) : null}

        <VoucherDetailCard
          title="Calculation summary"
          icon={<Calculator color="#4f46e5" size={19} />}
          iconBackgroundClass="bg-indigo-50"
        >
          <VoucherDetailRow
            label="Subtotal"
            value={formatAmount(totals.sub_total)}
          />
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
          <VoucherDetailRow
            label="Tax amount"
            value={formatAmount(totals.total_tax_amount)}
          />
          <VoucherDetailRow
            label="Item total"
            value={formatAmount(totals.item_total)}
          />
          <VoucherDetailRow
            label="Additional charges"
            value={formatAmount(totals.total_additional_charge)}
          />
          <View className="mt-2 border-t border-slate-200 pt-2">
            <VoucherDetailRow
              strong
              label="Final amount"
              value={formatAmount(totals.final_amount)}
            />
          </View>
        </VoucherDetailCard>
        {despatchRows.length > 0 ? (
          <VoucherDetailCard
            title="Despatch details"
            icon={<Truck color="#0f766e" size={19} />}
            iconBackgroundClass="bg-teal-50"
          >
            {despatchRows.map(([label, value]) => (
              <VoucherDetailRow
                key={label}
                label={label}
                value={value ?? "--"}
              />
            ))}
          </VoucherDetailCard>
        ) : null}
        {sale.narration?.trim() ? (
          <VoucherDetailCard
            title="Narration"
            icon={<ReceiptText color="#7c3aed" size={19} />}
            iconBackgroundClass="bg-violet-50"
          >
            <Text className="text-[12px] leading-5 text-slate-600">
              {sale.narration.trim()}
            </Text>
          </VoucherDetailCard>
        ) : null}
      </ScrollView>
      <VoucherCancellationSheet
        sheetRef={cancellationSheetRef}
        voucherLabel="sale"
        voucherNumber={sale.voucher_number}
        onConfirm={handleCancelSale}
        isLoading={cancelSaleMutation.isPending}
      />
      <PrintFormatSheet
        visible={isPrintFormatSheetVisible}
        onClose={() => setIsPrintFormatSheetVisible(false)}
        onContinue={handleContinueToPrintPreview}
      />
    </View>
  );
}
