import { useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactNode } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  CreditCard,
  FileText,
  Landmark,
  Pencil,
  Printer,
  ReceiptText,
  UserRound,
  XCircle,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { VoucherCancellationSheet } from "@/components/vouchers/VoucherCancellationSheet";
import { TallyProtectionNotice } from "@/components/vouchers/TallyProtectionNotice";
import {
  VoucherDetailCard,
  VoucherDetailHero,
  VoucherDetailMetric,
  VoucherDetailRow,
} from "@/components/vouchers/VoucherDetailUI";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { cashBankQueryKeys } from "@/hooks/queries/cashBankQueries";
import {
  receiptQueryKeys,
  useCancelReceiptMutation,
  useReceiptDetailQuery,
} from "@/hooks/queries/receiptQueries";
import {
  invalidateTodayTransactions,
  voucherTotalsSummaryQueryKeys,
} from "@/hooks/queries/voucherQueries";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearReceiptEdit } from "@/store/receiptEditSlice";
import { sortReceiptSettlementsFifo } from "@/utils/receipt";
import {
  getBackendErrorMessage,
  getTallyModificationMessage,
  getTallyModificationState,
  isReceiptOutstandingMissingConflict,
  isTallyAcceptedConflict,
  RECEIPT_OUTSTANDING_MISSING_MESSAGE,
} from "@/utils/tallyProtection";

function formatDate(value?: string | null): string {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value?: number | null): string {
  return `Rs. ${Number(value ?? 0).toFixed(2)}`;
}

type DisabledActionProps = {
  label: string;
  icon: ReactNode;
  tone: "primary" | "danger" | "neutral";
};

function DisabledAction({ label, icon, tone }: DisabledActionProps) {
  const buttonClasses = {
    primary: "border-[#134074] bg-[#134074]",
    danger: "border-rose-200 bg-rose-50",
    neutral: "border-blue-100 bg-white",
  };
  const textClasses = {
    primary: "text-white",
    danger: "text-rose-700",
    neutral: "text-[#134074]",
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} Receipt is unavailable`}
      accessibilityState={{ disabled: true }}
      disabled
      className={`flex-1 items-center justify-center rounded-2xl border px-2 py-3 opacity-60 ${buttonClasses[tone]}`}
    >
      {icon}
      <Text className={`mt-1 text-center text-[11px] font-extrabold ${textClasses[tone]}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function getCancellationErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || "Could not cancel Receipt";
  }

  return "Could not cancel Receipt. Check the Receipt status and try again.";
}

export default function ReceiptDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const cancellationSheetRef = useRef<BottomSheetModal>(null);
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const receiptEditId = useAppSelector((state) => state.receiptEdit.receiptId);
  const receiptId = params.id ?? "";
  const companyId = selectedCompany?._id ?? "";
  const receiptQuery = useReceiptDetailQuery(receiptId, companyId);
  const cancelReceiptMutation = useCancelReceiptMutation();

  if (!receiptId || !companyId) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Receipt Details" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[15px] font-bold text-slate-800">Receipt is not available</Text>
          <Text className="mt-2 text-center text-[12px] text-slate-500">
            Open the receipt again from Home or Daybook.
          </Text>
        </View>
      </View>
    );
  }

  if (receiptQuery.isLoading) {
    return <View className="flex-1 bg-white"><ScreenHeader title="Receipt Details" /><PageLoader message="Loading receipt..." /></View>;
  }

  if (receiptQuery.isError || !receiptQuery.data) {
    return <View className="flex-1 bg-white"><ScreenHeader title="Receipt Details" /><PageError title="Could not load receipt" description="The receipt may be unavailable or you may not have access." onRetry={() => void receiptQuery.refetch()} /></View>;
  }

  const receipt = receiptQuery.data;
  const settledBills = sortReceiptSettlementsFifo(
    receipt.settlement_details ?? [],
  );
  const isCancelled = receipt.status === "cancelled";
  const editTallyState = getTallyModificationState(
    receipt.tally_ref,
    receipt.status === "active",
  );
  const cancelTallyState = getTallyModificationState(
    receipt.tally_ref,
    receipt.status === "active",
  );
  const canEdit = editTallyState === "allowed";
  const canCancel = cancelTallyState === "allowed";

  const clearCurrentReceiptEdit = () => {
    if (receiptEditId === receiptId) {
      dispatch(clearReceiptEdit());
    }
  };

  const refreshAfterCancellation = async () => {
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vouchers }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.daybook }),
      invalidateTodayTransactions(queryClient, companyId),
      queryClient.invalidateQueries({
        queryKey: voucherTotalsSummaryQueryKeys.company(companyId),
      }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.outstanding }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties }),
      queryClient.invalidateQueries({ queryKey: cashBankQueryKeys.all }),
    ]);
  };

  const handleCancelReceipt = async () => {
    if (!canCancel || cancelReceiptMutation.isPending) return;

    const latest = await receiptQuery.refetch();
    const latestState = getTallyModificationState(
      latest.data?.tally_ref,
      latest.data?.status === "active",
    );
    if (latestState !== "allowed") {
      toast.error(getTallyModificationMessage(latestState));
      return;
    }

    try {
      const response = await cancelReceiptMutation.mutateAsync({
        receiptId,
        payload: { cmp_id: companyId },
      });
      const cancelledReceipt = response.data.cashTransaction;

      queryClient.setQueryData(
        receiptQueryKeys.detail(receiptId, companyId),
        cancelledReceipt,
      );
      clearCurrentReceiptEdit();
      cancellationSheetRef.current?.dismiss();
      await refreshAfterCancellation();
      toast.success(response.message || "Receipt cancelled successfully");
    } catch (error) {
      if (isReceiptOutstandingMissingConflict(error)) {
        cancellationSheetRef.current?.dismiss();
        await receiptQuery.refetch();
        toast.error(RECEIPT_OUTSTANDING_MISSING_MESSAGE);
        return;
      }
      const status = isAxiosError(error) ? error.response?.status : undefined;

      // A response can be lost after the backend commits. Reload before
      // reporting a failure so we never encourage a blind second cancel.
      if (status === undefined || status === 400 || status === 409) {
        try {
          const latestReceipt = await receiptQuery.refetch();
          if (latestReceipt.data?.status === "cancelled") {
            clearCurrentReceiptEdit();
            cancellationSheetRef.current?.dismiss();
            await refreshAfterCancellation();
            toast.success("Receipt is already cancelled");
            return;
          }
        } catch {
          // The original error below remains the clearest feedback when reload fails.
        }
      }

      if (isTallyAcceptedConflict(error)) {
        await refreshAfterCancellation();
        cancellationSheetRef.current?.dismiss();
      }
      toast.error(getBackendErrorMessage(error, getCancellationErrorMessage(error)));
    }
  };

  const handleEditReceipt = async () => {
    if (!canEdit) {
      if (!isCancelled) toast.error(getTallyModificationMessage(editTallyState));
      return;
    }
    const latest = await receiptQuery.refetch();
    const latestState = getTallyModificationState(
      latest.data?.tally_ref,
      latest.data?.status === "active",
    );
    if (latestState !== "allowed") {
      toast.error(getTallyModificationMessage(latestState));
      return;
    }
    router.push({ pathname: "/receipt-edit", params: { id: receipt._id } });
  };

  return (
    <View className="flex-1 bg-[#F5F7FB]">
      <ScreenHeader title="Receipt Details" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <VoucherDetailHero
          voucherType="Receipt"
          voucherNumber={receipt.voucher_number}
          status={receipt.status}
          statusTone={isCancelled ? "cancelled" : "active"}
          amount={formatAmount(receipt.amount)}
          date={formatDate(receipt.date)}
          customer={receipt.party_name || "No customer"}
        />



        <View className="mb-4 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit Receipt"
            accessibilityState={{ disabled: !canEdit }}
            disabled={!canEdit}
            onPress={() => void handleEditReceipt()}
            className={`flex-1 items-center justify-center rounded-2xl border border-[#134074] bg-[#134074] px-2 py-3 ${
              !canEdit ? "opacity-45" : ""
            }`}
          >
            <Pencil color="#ffffff" size={19} strokeWidth={2.3} />
            <Text className="mt-1 text-center text-[11px] font-extrabold text-white">
              Edit
            </Text>
          </Pressable>
          {canCancel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel Receipt"
              disabled={cancelReceiptMutation.isPending}
              onPress={() => cancellationSheetRef.current?.present()}
              className={`flex-1 items-center justify-center rounded-2xl border px-2 py-3 ${
                cancelReceiptMutation.isPending
                  ? "border-rose-200 bg-rose-100"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              <XCircle color="#e11d48" size={19} strokeWidth={2.3} />
              <Text className="mt-1 text-center text-[11px] font-extrabold text-rose-700">
                Cancel
              </Text>
            </Pressable>
          ) : (
            <DisabledAction
              label="Cancel"
              tone="danger"
              icon={<XCircle color="#e11d48" size={19} strokeWidth={2.3} />}
            />
          )}
          <DisabledAction
            label="Print / Export"
            tone="neutral"
            icon={<Printer color="#134074" size={19} strokeWidth={2.3} />}
          />
        </View>
        {editTallyState === "accepted" ? (
          <TallyProtectionNotice />
        ) : editTallyState === "unverified" && !isCancelled ? (
          <Text className="-mt-2 mb-4 text-center text-[12px] leading-5 text-slate-500">
            {getTallyModificationMessage("unverified")}
          </Text>
        ) : null}

          <View className="mb-4 flex-row gap-2">
          <VoucherDetailMetric label="Bills settled" value={String(settledBills.length)} />
          <VoucherDetailMetric label="Advance" value={formatAmount(receipt.advance_amount)} />
        </View>

        <VoucherDetailCard
          title="Customer"
          icon={<UserRound color="#2563eb" size={19} strokeWidth={2.3} />}
          iconBackgroundClass="bg-blue-50"
                  >
          <Text className="text-[15px] font-extrabold text-slate-900">
            {receipt.party_name || "--"}
          </Text>
          <View className="mt-2 border-t border-slate-100 pt-2">
            <VoucherDetailRow label="Receipt date" value={formatDate(receipt.date)} />
            <VoucherDetailRow
              label="Tally status"
              value={receipt.tally_ref?.tally_status ?? "Unavailable"}
            />
          </View>
        </VoucherDetailCard>

        <VoucherDetailCard
          title="Received into"
          icon={<Landmark color="#0f766e" size={19} strokeWidth={2.3} />}
          iconBackgroundClass="bg-teal-50"
                      >
          <Text className="text-[15px] font-extrabold text-slate-900">
            {receipt.cash_bank_name || "--"}
          </Text>
          <View className="mt-2 border-t border-slate-100 pt-2">
            <VoucherDetailRow label="Account type" value={receipt.cash_bank_type} />
          </View>
        </VoucherDetailCard>

        <VoucherDetailCard
          title="Payment details"
          icon={<CreditCard color="#7c3aed" size={19} strokeWidth={2.3} />}
          iconBackgroundClass="bg-violet-50"
        >
          <VoucherDetailRow label="Instrument" value={receipt.instrument_type.toUpperCase()} />
          {receipt.instrument_type === "cheque" ? (
            <View className="mt-2 border-t border-slate-100 pt-2">
              <Text className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.7px] text-slate-400">
                Cheque details
              </Text>
              <VoucherDetailRow label="Cheque number" value={receipt.cheque_number || "--"} />
              <VoucherDetailRow label="Cheque date" value={formatDate(receipt.cheque_date)} />
            </View>
          ) : null}
        </VoucherDetailCard>

        <VoucherDetailCard
          title={`Settled bills (${settledBills.length})`}
          icon={<ReceiptText color="#059669" size={19} strokeWidth={2.3} />}
          iconBackgroundClass="bg-emerald-50"
        >
          {settledBills.length ? (
            <View className="gap-3">
              {settledBills.map((bill) => (
                <View
                  key={bill._id || bill.outstanding}
                  className="rounded-[18px] border border-slate-100 bg-slate-50 p-3.5"
                >

                    <View className="flex-row items-center justify-between">
                      <Text className="text-[13px] font-extrabold text-slate-900">
                        {bill.outstanding_number || "Outstanding bill"}
                      </Text>
                      <Text className="mt-1 text-[11px] font-bold text-slate-500">
                        {formatDate(bill.outstanding_date)}
                      </Text>

                  </View>
                  <View className="mt-3 flex-row border-t border-slate-200 pt-3">
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-[0.6px] text-slate-400">
                        Settled
                      </Text>
                      <Text className="mt-1 text-[12px] font-extrabold text-slate-800">
                        {formatAmount(bill.settled_amount)}
                      </Text>
                    </View>
                    <View className="flex-1 border-l border-slate-200 pl-3">
                      <Text className="text-[10px] font-bold uppercase tracking-[0.6px] text-slate-400">
                        Remaining
                      </Text>
                      <Text className="mt-1 text-[12px] font-extrabold text-slate-800">
                        {formatAmount(bill.remaining_outstanding_amount)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-[12px] leading-5 text-slate-500">
              No bills were settled for this Receipt.
            </Text>
          )}
        </VoucherDetailCard>

        <VoucherDetailCard
          title="Narration"
          icon={<FileText color="#d97706" size={19} strokeWidth={2.3} />}
          iconBackgroundClass="bg-amber-50"
        >
          <Text className="text-[13px] leading-5 text-slate-600">
            {receipt.narration?.trim() || "No narration was added."}
          </Text>
        </VoucherDetailCard>
      </ScrollView>
      <VoucherCancellationSheet
        sheetRef={cancellationSheetRef}
        voucherLabel="Receipt"
        voucherNumber={receipt.voucher_number}
        description="This will reverse this Receipt's bill settlements and related ledger entries. This action cannot be undone from this screen."
        onConfirm={() => void handleCancelReceipt()}
        isLoading={cancelReceiptMutation.isPending}
      />
    </View>
  );
}
