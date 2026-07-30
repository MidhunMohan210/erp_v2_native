import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import {
  Ban,
  Box,
  Calculator,
  ReceiptText,
  Pencil,
  Printer,
  Share2,
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
import {
  saleOrderQueryKeys,
  useSaleOrderDetailQuery,
} from "@/hooks/queries/saleOrderQueries";
import { saleOrderService } from "@/services/saleOrder.service";
import { useAppSelector } from "@/store/hooks";
import type { SaleOrderPrintFormat } from "@/types/saleOrderPrint";

type DetailCardProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
};

type DetailRowProps = {
  label: string;
  value: string;
  strong?: boolean;
};

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

function DetailCard({ title, icon, children }: DetailCardProps) {
  return (
    <View className="mb-3 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
      <View className="flex-row items-center border-b border-slate-100 px-4 py-3">
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
          {icon}
        </View>
        <Text className="ml-2.5 text-[14px] font-extrabold text-slate-900">
          {title}
        </Text>
      </View>
      <View className="p-4">{children}</View>
    </View>
  );
}

function DetailRow({ label, value, strong = false }: DetailRowProps) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-1.5">
      <Text
        className={`flex-1 text-[12px] ${
          strong ? "font-extrabold text-slate-900" : "text-slate-500"
        }`}
      >
        {label}
      </Text>
      <Text
        className={`max-w-[58%] text-right text-[12px] ${
          strong ? "font-extrabold text-slate-950" : "font-semibold text-slate-800"
        }`}
      >
        {value}
      </Text>
    </View>
  );
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
      ]);

      cancellationSheetRef.current?.dismiss();
      toast.success(data.message || "Sale order cancelled");
    },
    onError: (error) => {
      toast.error(getCancellationErrorMessage(error));
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
  const statusBackgroundClass =
    saleOrder.status === "cancelled"
      ? "bg-rose-100"
      : saleOrder.status === "converted"
        ? "bg-amber-100"
        : "bg-emerald-100";
  const statusTextClass =
    saleOrder.status === "cancelled"
      ? "text-rose-700"
      : saleOrder.status === "converted"
        ? "text-amber-700"
        : "text-emerald-700";
  const handleShareSaleOrder = async () => {
    try {
      await Share.share({
        title: `Sale order ${saleOrder.voucher_number}`,
        message: [
          `Sale order: ${saleOrder.voucher_number}`,
          `Date: ${formatDate(saleOrder.date)}`,
          `Customer: ${party.name || "No customer"}`,
          `Status: ${saleOrder.status}`,
          `Final amount: ${formatAmount(totals.final_amount)}`,
        ].join("\n"),
      });
    } catch {
      toast.error("Could not open sharing options");
    }
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
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Sale Order Details"
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-3 overflow-hidden rounded-[15px] bg-[#3f5c76] p-5">
          <View className="flex-row items-start justify-between gap-4">
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-blue-200">
                Sale order
              </Text>
              <Text className="mt-1 text-[22px] font-extrabold text-white">
                {saleOrder.voucher_number}
              </Text>
              <Text className="mt-2 text-[12px] text-blue-100">
                {formatDate(saleOrder.date)} · {party.name || "No customer"}
              </Text>
            </View>
            <View
              className={`rounded-full px-3 py-1.5 ${statusBackgroundClass}`}
            >
              <Text
                className={`text-[10px] font-extrabold uppercase ${statusTextClass}`}
              >
                {saleOrder.status}
              </Text>
            </View>
          </View>
          <View className="mt-5 border-t border-gray-200 pt-4">
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-blue-200">
              Final amount
            </Text>
            <Text className="mt-1 text-[25px] font-extrabold text-white">
              {formatAmount(totals.final_amount)}
            </Text>
          </View>
        </View>

        <View className="mb-3 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit sale order"
            disabled={saleOrder.status !== "open"}
            onPress={() =>
              router.push({
                pathname: "/sale-order-edit",
                params: { id: saleOrder._id },
              })
            }
            className={`flex-1 flex-row items-center justify-center rounded-2xl border px-2 py-3.5 ${
              saleOrder.status === "open"
                ? "border-[#134074] bg-[#134074]"
                : "border-slate-200 bg-slate-100"
            }`}
          >
            <Pencil
              color={saleOrder.status === "open" ? "#ffffff" : "#94a3b8"}
              size={16}
              strokeWidth={2.2}
            />
            <Text
              className={`ml-1.5 text-[12px] font-extrabold ${
                saleOrder.status === "open"
                  ? "text-white"
                  : "text-slate-400"
              }`}
            >
              Edit
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel sale order"
            disabled={saleOrder.status !== "open"}
            onPress={() => cancellationSheetRef.current?.present()}
            className={`flex-1 flex-row items-center justify-center rounded-2xl border px-2 py-3.5 ${
              saleOrder.status === "open"
                ? "border-rose-200 bg-rose-50"
                : "border-slate-200 bg-slate-100"
            }`}
          >
            <Ban
              color={saleOrder.status === "open" ? "#be123c" : "#94a3b8"}
              size={16}
              strokeWidth={2.2}
            />
            <Text
              className={`ml-1.5 text-[12px] font-extrabold ${
                saleOrder.status === "open"
                  ? "text-rose-700"
                  : "text-slate-400"
              }`}
            >
              Cancel
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Print sale order"
            onPress={() => setIsPrintFormatSheetVisible(true)}
            className="flex-1 flex-row items-center justify-center rounded-2xl border border-[#134074] bg-white px-2 py-3.5"
          >
            <Printer color="#134074" size={16} strokeWidth={2.2} />
            <Text className="ml-1.5 text-[12px] font-extrabold text-[#134074]">
              Print
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share sale order"
            onPress={() => void handleShareSaleOrder()}
            className="flex-1 flex-row items-center justify-center rounded-2xl border border-[#134074] bg-white px-2 py-3.5"
          >
            <Share2 color="#134074" size={16} strokeWidth={2.2} />
            <Text className="ml-1.5 text-[12px] font-extrabold text-[#134074]">
              Share
            </Text>
          </Pressable>
        </View>

        <View className="mb-3 flex-row gap-2">
          <View className="flex-1 rounded-2xl border border-blue-100 bg-blue-50 p-3">
            <Text className="text-[10px] font-bold uppercase text-blue-500">
              Items
            </Text>
            <Text className="mt-1 text-[16px] font-extrabold text-blue-950">
              {saleOrder.items.length}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
            <Text className="text-[10px] font-bold uppercase text-slate-400">
              Tax type
            </Text>
            <Text className="mt-1 text-[13px] font-extrabold uppercase text-slate-900">
              {saleOrder.tax_type === "cgst_sgst" ? "CGST + SGST" : "IGST"}
            </Text>
          </View>
          {/* <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
            <Text className="text-[10px] font-bold uppercase text-slate-400">
              Price level
            </Text>
            <Text numberOfLines={1} className="mt-1 text-[13px] font-extrabold text-slate-900">
              {saleOrder.price_level_name || "--"}
            </Text>
          </View> */}
        </View>

        <DetailCard
          title="Customer"
          icon={<UserRound color="#2563eb" size={17} />}
        >
          <Text className="text-[14px] font-extrabold text-slate-900">
            {party.name || "--"}
          </Text>
          {party.mobile ? (
            <Text className="mt-2 text-[12px] text-slate-600">{party.mobile}</Text>
          ) : null}
          {party.gst_no ? (
            <Text className="mt-1 text-[12px] text-slate-600">
              GSTIN: {party.gst_no}
            </Text>
          ) : null}
          {party.billing_address ? (
            <Text className="mt-1 text-[12px] leading-5 text-slate-600">
              {party.billing_address}
            </Text>
          ) : null}
          {party.shipping_address ? (
            <Text className="mt-1 text-[12px] leading-5 text-slate-600">
              Shipping: {party.shipping_address}
            </Text>
          ) : null}
        </DetailCard>

        <DetailCard
          title={`Products (${saleOrder.items.length})`}
          icon={<Box color="#2563eb" size={17} />}
        >
          {saleOrder.items.map((item, index) => (
            <View
              key={item._id}
              className={`rounded-2xl border border-slate-200 bg-slate-50 p-3.5 ${
                index > 0 ? "mt-2.5" : ""
              }`}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] font-extrabold text-slate-900">
                    {item.item_name}
                  </Text>
                  <Text className="mt-1 text-[11px] text-slate-500">
                    Billed {formatQuantity(item.billed_qty)} {item.unit || ""} ·
                    Actual {formatQuantity(item.actual_qty)}
                  </Text>
                  <Text className="mt-1 text-[11px] text-slate-500">
                    Rate {formatAmount(item.rate)} ·{" "}
                    {saleOrder.tax_type === "igst" ? "IGST" : "GST"} (
                    {formatPercent(item.tax_rate)}%)
                  </Text>
                  {item.cess_rate || item.addl_cess_rate ? (
                    <Text className="mt-1 text-[11px] text-slate-500">
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
                    <Text className="mt-1 text-[11px] text-slate-500">
                      {[item.hsn ? `HSN ${item.hsn}` : "", item.description]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-[13px] font-extrabold text-slate-900">
                  {formatAmount(item.total_amount)}
                </Text>
              </View>
            </View>
          ))}
        </DetailCard>

        <DetailCard
          title="Additional charges"
          icon={<ReceiptText color="#2563eb" size={17} />}
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
                  <Text className="text-[12px] font-extrabold text-slate-900">
                    {formatAmount(charge.final_value)}
                  </Text>
                </View>
              );
            })
          )}
        </DetailCard>

        <DetailCard
          title="Calculation summary"
          icon={<Calculator color="#2563eb" size={17} />}
        >
          <DetailRow label="Subtotal" value={formatAmount(totals.sub_total)} />
          <DetailRow
            label="Discount"
            value={formatAmount(totals.total_discount)}
          />
          <DetailRow
            label="Taxable amount"
            value={formatAmount(totals.taxable_amount)}
          />
          {totals.total_igst_amt ? (
            <DetailRow
              label="IGST"
              value={formatAmount(totals.total_igst_amt)}
            />
          ) : null}
          {totals.total_cgst_amt ? (
            <DetailRow
              label="CGST"
              value={formatAmount(totals.total_cgst_amt)}
            />
          ) : null}
          {totals.total_sgst_amt ? (
            <DetailRow
              label="SGST"
              value={formatAmount(totals.total_sgst_amt)}
            />
          ) : null}
          {totals.total_cess_amt ? (
            <DetailRow
              label="Cess"
              value={formatAmount(totals.total_cess_amt)}
            />
          ) : null}
          {totals.total_addl_cess_amt ? (
            <DetailRow
              label="Additional cess"
              value={formatAmount(totals.total_addl_cess_amt)}
            />
          ) : null}
          <DetailRow
            label="Tax amount"
            value={formatAmount(totals.total_tax_amount)}
          />
          <DetailRow
            label="Additional charges"
            value={formatAmount(totals.total_additional_charge)}
          />
          {totals.total_additional_charge_tax_amount ? (
            <DetailRow
              label="Additional-charge tax"
              value={formatAmount(totals.total_additional_charge_tax_amount)}
            />
          ) : null}
          {totals.total_additional_charge_igst_amt ? (
            <DetailRow
              label="Additional-charge IGST"
              value={formatAmount(totals.total_additional_charge_igst_amt)}
            />
          ) : null}
          {totals.total_additional_charge_cgst_amt ? (
            <DetailRow
              label="Additional-charge CGST"
              value={formatAmount(totals.total_additional_charge_cgst_amt)}
            />
          ) : null}
          {totals.total_additional_charge_sgst_amt ? (
            <DetailRow
              label="Additional-charge SGST"
              value={formatAmount(totals.total_additional_charge_sgst_amt)}
            />
          ) : null}
          {totals.total_additional_charge_cess_amt ? (
            <DetailRow
              label="Additional-charge cess"
              value={formatAmount(totals.total_additional_charge_cess_amt)}
            />
          ) : null}
          <View className="mt-2 border-t border-slate-200 pt-2">
            <DetailRow
              strong
              label="Final amount"
              value={formatAmount(totals.final_amount)}
            />
          </View>
        </DetailCard>

        <DetailCard
          title="Despatch details"
          icon={<Truck color="#2563eb" size={17} />}
        >
          {despatchRows.length === 0 ? (
            <Text className="text-[12px] text-slate-500">
              No despatch details.
            </Text>
          ) : (
            despatchRows.map(([label, value]) => (
              <DetailRow
                key={label}
                label={label ?? ""}
                value={value ?? "--"}
              />
            ))
          )}
        </DetailCard>
      </ScrollView>

      <VoucherCancellationSheet
        sheetRef={cancellationSheetRef}
        voucherLabel="sale order"
        voucherNumber={saleOrder.voucher_number}
        onConfirm={() => cancelSaleOrderMutation.mutate()}
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
