import { useMemo, useRef, useState } from "react";
import type React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ShieldCheck } from "lucide-react-native";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { cashBankQueryKeys } from "@/hooks/queries/cashBankQueries";
import {
  receiptQueryKeys,
  useCreateReceiptMutation,
} from "@/hooks/queries/receiptQueries";
import {
  voucherSeriesQueryKeys,
  voucherTotalsSummaryQueryKeys,
} from "@/hooks/queries/voucherQueries";
import { loadCurrentReceiptOutstanding } from "@/services/receiptOutstandingValidation.service";
import { receiptSubmissionRecoveryService } from "@/services/receiptSubmissionRecovery.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearReceiptDraft,
  setReceiptAllocationProgress,
  setReceiptSubmissionRecoveryState,
  setReceiptSubmittedPayload,
} from "@/store/receiptDraftSlice";
import type {
  CreateReceiptRequest,
  ReceiptSubmissionRecoveryState,
} from "@/types/receipt";
import {
  buildReceiptCreatePayload,
  calculateReceiptRemainingAmount,
  calculateReceiptTotalSettled,
  getReceiptReviewValidationError,
  getStaleReceiptAllocationError,
  type ReceiptReviewDraftInput,
} from "@/utils/receipt";

type ReceiptConfirmationSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSuccessfulNavigation: () => void;
};

function formatMoney(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || "--";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : "Could not create Receipt";
}

type SummaryRowProps = {
  label: string;
  value: string;
};

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <View className="flex-row items-start justify-between border-b border-slate-100 py-2.5 last:border-b-0">
      <Text className="mr-4 flex-1 text-[12px] text-slate-500">{label}</Text>
      <Text className="max-w-[62%] text-right text-[12px] font-bold text-slate-800">
        {value}
      </Text>
    </View>
  );
}

export function ReceiptConfirmationSheet({
  sheetRef,
  onSuccessfulNavigation,
}: ReceiptConfirmationSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const userId = useAppSelector((state) => state.auth.user?._id ?? "");
  const receiptDraft = useAppSelector((state) => state.receiptDraft);
  const companyId = selectedCompany?._id ?? "";
  const createReceiptMutation = useCreateReceiptMutation();
  const isSubmittingRef = useRef(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const reviewInput = useMemo<ReceiptReviewDraftInput>(
    () => ({
      companyId,
      draftCompanyId: receiptDraft.companyId,
      requestId: receiptDraft.requestId,
      transactionDate: receiptDraft.transactionDate,
      selectedSeries: receiptDraft.selectedSeries,
      selectedParty: receiptDraft.selectedParty,
      receiptAmount: receiptDraft.receiptAmount,
      selectedCashBank: receiptDraft.selectedCashBank,
      instrumentType: receiptDraft.instrumentType,
      allocations: receiptDraft.allocations,
      allocationStatus: receiptDraft.allocationStatus,
      narration: receiptDraft.narration,
      chequeNumber: receiptDraft.chequeNumber,
      chequeDate: receiptDraft.chequeDate,
    }),
    [companyId, receiptDraft],
  );
  const frozenPayload = receiptDraft.submittedPayload;
  const validationError = frozenPayload
    ? frozenPayload.cmp_id === companyId
      ? null
      : "This saved submission belongs to another company"
    : getReceiptReviewValidationError(reviewInput);
  const receiptAmount = Number(
    frozenPayload?.amount ?? receiptDraft.receiptAmount,
  );
  const allocations = frozenPayload
    ? frozenPayload.settlement_details.map((row) => ({
        outstandingId: row.outstanding,
        settledAmount: row.settled_amount,
      }))
    : receiptDraft.allocations;
  const totalSettled = calculateReceiptTotalSettled(allocations);
  const advanceAmount = calculateReceiptRemainingAmount(
    receiptAmount,
    allocations,
  );
  const isBusy = isPreparing || createReceiptMutation.isPending;

  const saveRecoveryState = async (
    payload: CreateReceiptRequest,
    state: ReceiptSubmissionRecoveryState,
  ) => {
    await receiptSubmissionRecoveryService.save({
      userId,
      companyId,
      seriesName: receiptDraft.selectedSeries?.seriesName ?? "Receipt series",
      payload,
      state,
    });
  };

  const markRecoverableFailure = async (
    payload: CreateReceiptRequest,
    state: "uncertain" | "conflict",
  ) => {
    dispatch(setReceiptSubmissionRecoveryState(state));
    try {
      await saveRecoveryState(payload, state);
    } catch {
      toast.error("Receipt stays locked, but local recovery could not be updated.");
    }
  };

  const finishSuccess = async (
    receiptId: string,
    voucherNumber: string,
    wasReplay: boolean,
  ) => {
    try {
      await receiptSubmissionRecoveryService.clear(userId, companyId);
    } catch {
      toast.error("Receipt was saved, but local recovery cleanup must be retried.");
    }

    // The parent Create screen must permit this replace even if state updates
    // happen before React Navigation processes its beforeRemove listener.
    onSuccessfulNavigation();
    router.replace({ pathname: "/receipt-detail", params: { id: receiptId } });
    sheetRef.current?.dismiss();
    dispatch(clearReceiptDraft());
    toast.success(
      wasReplay
        ? `Receipt ${voucherNumber || ""} recovered successfully`.trim()
        : `Receipt ${voucherNumber || ""} created`.trim(),
    );

    // Outstanding balances change after a Receipt settles bills. Refresh every
    // cached outstanding view after moving to the newly created Receipt.
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vouchers }),
      queryClient.invalidateQueries({ queryKey: ["daybook", companyId] }),
      queryClient.invalidateQueries({
        queryKey: voucherTotalsSummaryQueryKeys.company(companyId),
      }),
      queryClient.invalidateQueries({
        queryKey: voucherSeriesQueryKeys.list(companyId, "receipt"),
      }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.outstanding }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties }),
      queryClient.invalidateQueries({ queryKey: cashBankQueryKeys.all }),
    ]);
  };

  const submitFrozenPayload = async (payload: CreateReceiptRequest) => {
    try {
      // Every POST has a durable exact-body retry record before it starts.
      await saveRecoveryState(payload, "submitting");
      dispatch(setReceiptSubmissionRecoveryState("submitting"));
    } catch {
      dispatch(setReceiptSubmissionRecoveryState("uncertain"));
      toast.error("Receipt was not sent because safe retry storage is unavailable.");
      return;
    }

    try {
      const response = await createReceiptMutation.mutateAsync(payload);
      const receipt = response.data.cashTransaction;
      await finishSuccess(
        receipt._id,
        receipt.voucher_number,
        response.idempotent_replay,
      );
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;

      if (status === 409) {
        await markRecoverableFailure(payload, "conflict");
        sheetRef.current?.dismiss();
        toast.error(
          "This request ID belongs to a different Receipt. Start a new Receipt to continue.",
        );
        return;
      }

      const isDefinitiveClientFailure =
        status !== undefined && status >= 400 && status < 500 && status !== 408;
      if (isDefinitiveClientFailure) {
        try {
          await receiptSubmissionRecoveryService.clear(userId, companyId);
        } catch {
          toast.error("Could not clear the local retry record.");
        }
        dispatch(setReceiptSubmittedPayload(null));
        sheetRef.current?.dismiss();
        toast.error(getErrorMessage(error));
        return;
      }

      await markRecoverableFailure(payload, "uncertain");
      toast.error("Unable to confirm whether the Receipt was saved. Retry uses the same request.");
    }
  };

  const handleConfirm = async () => {
    if (isSubmittingRef.current || isBusy || validationError || !userId) return;
    isSubmittingRef.current = true;

    try {
      if (frozenPayload) {
        await submitFrozenPayload(frozenPayload);
        return;
      }

      setIsPreparing(true);
      let currentBills;
      try {
        currentBills = await loadCurrentReceiptOutstanding({
          partyId: receiptDraft.selectedParty?._id ?? "",
          companyId,
        });
      } catch {
        toast.error("Could not refresh Outstanding balances. The Receipt was not submitted.");
        return;
      }

      const staleError = getStaleReceiptAllocationError(
        receiptDraft.allocations,
        currentBills,
      );
      if (staleError) {
        dispatch(setReceiptAllocationProgress(receiptDraft.allocations));
        sheetRef.current?.dismiss();
        toast.error(staleError);
        router.push("/receipt-allocation");
        return;
      }

      const payload = buildReceiptCreatePayload(reviewInput);
      dispatch(setReceiptSubmittedPayload(payload));
      await submitFrozenPayload(payload);
    } finally {
      setIsPreparing(false);
      isSubmittingRef.current = false;
    }
  };

  const displayInstrument =
    frozenPayload?.instrument_type ?? receiptDraft.instrumentType;
  const displayAccount =
    frozenPayload?.cash_bank_name ?? receiptDraft.selectedCashBank?.partyName ?? "--";
  const displayNarration =
    (frozenPayload?.narration ?? receiptDraft.narration.trim()) || "--";

  return (
    <BottomSheetModal
      ref={sheetRef}
      // The optional Cheque and narration rows change the content height.
      // Dynamic sizing keeps the sheet compact while still allowing it to grow.
      enableDynamicSizing
      enablePanDownToClose={!isBusy}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: "white", borderRadius: 28 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
      )}
    >
      <BottomSheetView>
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 20,
          }}
        >
          <View className="mb-4 flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
            <ShieldCheck color="#134074" size={22} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[18px] font-extrabold text-slate-900">Confirm Receipt</Text>
            <Text className="mt-0.5 text-[11px] text-slate-500">The backend assigns the final voucher number.</Text>
          </View>
          </View>

          <View className="rounded-3xl bg-slate-50 px-4 py-2">
          <SummaryRow label="Customer" value={frozenPayload?.party_name ?? receiptDraft.selectedParty?.partyName ?? "--"} />
          <SummaryRow label="Receipt date" value={formatDate(frozenPayload?.date ?? receiptDraft.transactionDate)} />
          <SummaryRow label="Receipt amount" value={formatMoney(receiptAmount)} />
          <SummaryRow label="Allocated" value={formatMoney(totalSettled)} />
          <SummaryRow label="Advance" value={formatMoney(advanceAmount)} />
          <SummaryRow label="Payment method" value={displayInstrument.toUpperCase()} />
          <SummaryRow label="Received into" value={displayAccount} />
          {displayInstrument === "cheque" ? (
            <>
              <SummaryRow label="Cheque number" value={frozenPayload?.cheque_number ?? receiptDraft.chequeNumber} />
              <SummaryRow label="Cheque date" value={formatDate(frozenPayload?.cheque_date ?? receiptDraft.chequeDate ?? "")} />
            </>
          ) : null}
          {displayNarration !== "--" ? <SummaryRow label="Narration" value={displayNarration} /> : null}
          </View>

        <View className="mt-4 gap-3 border-t border-slate-200 bg-white  pb-1 pt-3">
          <Pressable
            accessibilityRole="button"
            disabled={isBusy || Boolean(validationError)}
            onPress={() => void handleConfirm()}
            className={`min-h-14 flex-row items-center justify-center rounded-2xl bg-[#134074] px-4 ${isBusy || validationError ? "opacity-60" : ""}`}
          >
            {isBusy ? <ActivityIndicator color="#ffffff" size="small" /> : null}
            <Text className={`text-[15px] font-extrabold text-white ${isBusy ? "ml-2" : ""}`}>
              {isBusy ? (isPreparing ? "Refreshing balances..." : "Creating Receipt...") : frozenPayload ? "Retry Receipt" : "Confirm & Create"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => sheetRef.current?.dismiss()}
            className="min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4"
          >
            <Text className="text-[14px] font-bold text-slate-700">Cancel</Text>
          </Pressable>
        </View>
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
