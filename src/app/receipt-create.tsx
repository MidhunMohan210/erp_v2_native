import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useNavigation, useRouter } from "expo-router";
import { ArrowRight, ReceiptText } from "lucide-react-native";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ReceiptCashBankSection } from "@/components/receipt-create/ReceiptCashBankSection";
import { ReceiptChequeSection } from "@/components/receipt-create/ReceiptChequeSection";
import { ReceiptInstrumentSection } from "@/components/receipt-create/ReceiptInstrumentSection";
import { ReceiptNarrationSection } from "@/components/receipt-create/ReceiptNarrationSection";
import { DiscardDraftSheet } from "@/components/voucher-create/DiscardDraftSheet";
import { VoucherCreateHeader } from "@/components/voucher-create/VoucherCreateHeader";
import { VoucherEmptyState } from "@/components/voucher-create/VoucherEmptyState";
import { VoucherErrorState } from "@/components/voucher-create/VoucherErrorState";
import { VoucherLoadingState } from "@/components/voucher-create/VoucherLoadingState";
import { VoucherPartyModal } from "@/components/voucher-create/VoucherPartyModal";
import { VoucherPartySelector } from "@/components/voucher-create/VoucherPartySelector";
import { VoucherSeriesModal } from "@/components/voucher-create/VoucherSeriesModal";
import { VoucherSeriesSelector } from "@/components/voucher-create/VoucherSeriesSelector";
import {
  invalidateTodayTransactions,
  useVoucherSeriesListQuery,
  voucherSeriesQueryKeys,
  voucherTotalsSummaryQueryKeys,
} from "@/hooks/queries/voucherQueries";
import { cashBankQueryKeys } from "@/hooks/queries/cashBankQueries";
import { receiptQueryKeys, useCreateReceiptMutation } from "@/hooks/queries/receiptQueries";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { migrateLegacyReceiptRecovery } from "@/services/pendingSubmissions/legacyReceiptRecoveryMigration.service";
import { subscribeToPendingSubmissionResolution } from "@/services/pendingSubmissions/pendingSubmissionResolutionEvents";
import {
  removeReceiptPendingSubmission,
  saveReceiptPendingSubmission,
  updateReceiptPendingSubmissionStatus,
} from "@/services/pendingSubmissions/receiptPendingSubmission.service";
import { loadCurrentReceiptOutstanding } from "@/services/receiptOutstandingValidation.service";
import {
  createVoucherOperationContext,
  isCurrentVoucherOperationContext,
  type VoucherOperationContext,
} from "@/services/voucherOperationContext";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearReceiptDraft,
  initializeReceiptDraft,
  setReceiptCashBank,
  setReceiptChequeDetails,
  setReceiptDate,
  setReceiptInstrument,
  setReceiptNarration,
  setReceiptParty,
  setReceiptSeries,
  setReceiptAllocationProgress,
  setReceiptSubmissionRecoveryState,
  setReceiptSubmittedPayload,
} from "@/store/receiptDraftSlice";
import type { Party } from "@/types/party";
import type { VoucherSeriesItem } from "@/types/voucher";
import {
  buildReceiptCreatePayload,
  calculateReceiptRemainingAmount,
  calculateReceiptTotalSettled,
  getReceiptReviewValidationError,
  getStaleReceiptAllocationError,
  type ReceiptReviewDraftInput,
} from "@/utils/receipt";
import type { CreateReceiptRequest } from "@/types/receipt";
import { createReceiptRequestId } from "@/utils/receiptRequestId";
import { getTodayDateString } from "@/utils/voucher";

type DraftInitialization = {
  companyId: string;
  requestId: string;
};

function isVoucherContextActive(context: VoucherOperationContext): boolean {
  const currentState = store.getState();
  return isCurrentVoucherOperationContext(
    context,
    currentState.auth.user?._id,
    currentState.company.selectedCompany?._id,
  );
}

export default function ReceiptCreateScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const formScrollViewRef = useRef<ScrollView>(null);
  const isNarrationFocusedRef = useRef(false);
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const receiptDraft = useAppSelector((state) => state.receiptDraft);
  const userId = useAppSelector((state) => state.auth.user?._id ?? "");
  const companyId = selectedCompany?._id ?? "";
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const initializationRef = useRef<DraftInitialization | null>(null);
  const discardDraftSheetRef = useRef<BottomSheetModal>(null);
  const conflictRecoverySheetRef = useRef<BottomSheetModal>(null);
  const isDraftLocked = receiptDraft.submittedPayload !== null;
  const isDraftLockedRef = useRef(isDraftLocked);
  const isBackConfirmedRef = useRef(false);
  const isSuccessfulNavigationRef = useRef(false);
  const pendingBackActionRef = useRef<(() => void) | null>(null);
  const isSubmittingRef = useRef(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const createReceiptMutation = useCreateReceiptMutation();
  isDraftLockedRef.current = isDraftLocked;

  const scrollNarrationAboveKeyboard = () => {
    // Android reports the focused TextInput before its keyboard has resized the
    // available viewport. Delay until the final keyboard layout is applied.
    setTimeout(() => formScrollViewRef.current?.scrollToEnd({ animated: true }), 80);
  };

  useEffect(() => {
    const keyboardShownSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
      if (isNarrationFocusedRef.current) scrollNarrationAboveKeyboard();
    });
    const keyboardHiddenSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      keyboardShownSubscription.remove();
      keyboardHiddenSubscription.remove();
    };
  }, []);

  useEffect(() => {
    // An uncertain Receipt is stored separately in PendingSubmissionStorage.
    // Leaving this screen should discard only the active form, never the
    // recoverable submission that may need later reconciliation or retry.
    return navigation.addListener("beforeRemove", (event) => {
      if (isSuccessfulNavigationRef.current) {
        return;
      }

      if (isDraftLockedRef.current) {
        dispatch(clearReceiptDraft());
        return;
      }

      if (isBackConfirmedRef.current) return;

      event.preventDefault();
      pendingBackActionRef.current = () => {
        isBackConfirmedRef.current = true;
        dispatch(clearReceiptDraft());
        navigation.dispatch(event.data.action);
      };
      discardDraftSheetRef.current?.present();
    });
  }, [dispatch, navigation]);

  const seriesQuery = useVoucherSeriesListQuery(
    companyId,
    "receipt",
    Boolean(companyId),
  );
  const series = useMemo(
    () => seriesQuery.data?.series ?? [],
    [seriesQuery.data],
  );

  useEffect(() => {
    setIsSeriesModalOpen(false);
    setIsPartyModalOpen(false);
    if (!companyId || !userId) {
      initializationRef.current = null;
      dispatch(clearReceiptDraft());
      return;
    }

    if (receiptDraft.companyId === companyId && receiptDraft.requestId) {
      return;
    }

    if (initializationRef.current?.companyId !== companyId) {
      initializationRef.current = {
        companyId,
        requestId: createReceiptRequestId(),
      };
    }

    dispatch(
      initializeReceiptDraft({
        companyId,
        requestId: initializationRef.current.requestId,
        transactionDate: getTodayDateString(),
      }),
    );
  }, [
    companyId,
    dispatch,
    receiptDraft.companyId,
    receiptDraft.requestId,
    userId,
  ]);

  useEffect(() => {
    if (!userId || !companyId) return;
    // Safe, idempotent migration preserves old durable submissions without
    // restoring them into this new editable Receipt form.
    void migrateLegacyReceiptRecovery(userId, companyId);
  }, [companyId, userId]);

  useEffect(() => {
    const context = createVoucherOperationContext(userId, companyId);
    return subscribeToPendingSubmissionResolution((event) => {
      if (!isVoucherContextActive(context)) return;
      if (
        event.transactionType !== "receipt" ||
        event.userId !== userId ||
        event.companyId !== companyId ||
        event.requestId !== receiptDraft.submittedPayload?.request_id
      ) {
        return;
      }

      // Clearing Redux alone is not enough: this screen can render once more
      // before navigation completes, and the ref would otherwise recreate the
      // just-resolved UUID as a new Receipt draft.
      initializationRef.current = null;
      dispatch(clearReceiptDraft());
      toast.success("Receipt was confirmed in the background.");
    });
  }, [companyId, dispatch, receiptDraft.submittedPayload?.request_id, userId]);

  useEffect(() => {
    const draftMatchesCompany = receiptDraft.companyId === companyId;
    if (
      !companyId ||
      !draftMatchesCompany ||
      !seriesQuery.isSuccess ||
      isDraftLocked
    ) {
      return;
    }

    if (series.length === 0) {
      if (receiptDraft.selectedSeries) dispatch(setReceiptSeries(null));
      return;
    }

    const selectedStillExists = series.some(
      (item) => item._id === receiptDraft.selectedSeries?._id,
    );
    if (selectedStillExists) return;

    const defaultSeries =
      series.find((item) => item.currentlySelected || item.isDefault) ??
      series[0];
    dispatch(setReceiptSeries(defaultSeries));
  }, [
    companyId,
    dispatch,
    isDraftLocked,
    receiptDraft.companyId,
    receiptDraft.selectedSeries,
    series,
    seriesQuery.isSuccess,
  ]);

  const handleConfirmSeries = (nextSeries: VoucherSeriesItem) => {
    dispatch(setReceiptSeries(nextSeries));
    setIsSeriesModalOpen(false);
  };

  const handleConfirmParty = (party: Party) => {
    dispatch(setReceiptParty(party));
    setIsPartyModalOpen(false);
  };

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
  const createValidationError = isDraftLocked
    ? null
    : getReceiptReviewValidationError(reviewInput);
  const receiptAmount = Number(receiptDraft.receiptAmount) || 0;
  const totalSettled = calculateReceiptTotalSettled(receiptDraft.allocations);
  const advanceAmount = calculateReceiptRemainingAmount(
    receiptAmount,
    receiptDraft.allocations,
  );

  const handleOpenAllocation = () => {
    if (isDraftLocked) {
      toast.error("This Receipt submission is locked. Retry it from Create Receipt.");
      return;
    }

    if (!companyId || receiptDraft.companyId !== companyId) {
      toast.error("Select a company before allocating this Receipt");
      return;
    }
    if (receiptDraft.selectedParty?.partyType !== "party") {
      toast.error("Select a customer before allocating this Receipt");
      return;
    }
    router.push("/receipt-allocation");
  };

  const getCreateErrorMessage = (error: unknown): string => {
    if (isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : "Could not create Receipt";
  };

  const markRecoverableFailure = async (
    payload: CreateReceiptRequest,
    state: "uncertain" | "conflict",
    context: VoucherOperationContext,
  ) => {
    if (!isVoucherContextActive(context)) return;
    dispatch(setReceiptSubmissionRecoveryState(state));
    try {
      await updateReceiptPendingSubmissionStatus(
        userId,
        companyId,
        payload.request_id,
        state,
      );
    } catch {
      if (isVoucherContextActive(context)) {
        toast.error(
          "Receipt stays locked, but pending submission status could not be updated.",
        );
      }
    }
  };

  const finishSuccessfulSubmission = async (
    payload: CreateReceiptRequest,
    receiptId: string,
    voucherNumber: string,
    wasReplay: boolean,
    context: VoucherOperationContext,
  ) => {
    if (!isVoucherContextActive(context)) return;
    try {
      await removeReceiptPendingSubmission(userId, companyId, payload.request_id);
    } catch {
      if (isVoucherContextActive(context)) {
        toast.error("Receipt was saved, but pending submission cleanup must be retried.");
      }
    }

    if (!isVoucherContextActive(context)) {
      // Cleanup may finish after a company or account change. Restore this
      // exact record for its original context instead of losing recovery data.
      await saveReceiptPendingSubmission({
        userId,
        companyId,
        payload,
        status: "uncertain",
      }).catch(() => undefined);
      return;
    }

    isSuccessfulNavigationRef.current = true;
    // The next initialization after this confirmed 201/200 must create a new
    // logical Receipt UUID, not reuse the ID held by this mounted screen.
    initializationRef.current = null;
    dispatch(clearReceiptDraft());
    toast.success(
      wasReplay
        ? `Receipt ${voucherNumber || ""} recovered successfully`.trim()
        : `Receipt ${voucherNumber || ""} created`.trim(),
    );
    router.replace({ pathname: "/receipt-detail", params: { id: receiptId } });

    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vouchers }),
      queryClient.invalidateQueries({ queryKey: ["daybook", companyId] }),
      invalidateTodayTransactions(queryClient, companyId),
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
    const context = createVoucherOperationContext(userId, companyId);
    try {
      // Persist the exact body before POST so lost responses remain recoverable.
      await saveReceiptPendingSubmission({
        userId,
        companyId,
        payload,
        status: "uncertain",
      });
      if (!isVoucherContextActive(context)) return;
      dispatch(setReceiptSubmissionRecoveryState("submitting"));
    } catch {
      if (!isVoucherContextActive(context)) return;
      dispatch(setReceiptSubmissionRecoveryState("uncertain"));
      toast.error("Receipt was not sent because safe retry storage is unavailable.");
      return;
    }

    try {
      const response = await createReceiptMutation.mutateAsync(payload);
      if (!isVoucherContextActive(context)) return;
      const receipt = response.data.cashTransaction;
      await finishSuccessfulSubmission(
        payload,
        receipt._id,
        receipt.voucher_number,
        response.idempotent_replay,
        context,
      );
    } catch (error) {
      if (!isVoucherContextActive(context)) return;
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 409) {
        await markRecoverableFailure(payload, "conflict", context);
        if (!isVoucherContextActive(context)) return;
        toast.error(
          "This request ID belongs to a different Receipt. Start a new Receipt to continue.",
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
          await removeReceiptPendingSubmission(userId, companyId, payload.request_id);
        } catch {
          if (isVoucherContextActive(context)) {
            toast.error("Could not clear the local retry record.");
          }
        }
        if (!isVoucherContextActive(context)) return;
        dispatch(setReceiptSubmittedPayload(null));
        toast.error(getCreateErrorMessage(error));
        return;
      }

      await markRecoverableFailure(payload, "uncertain", context);
      if (!isVoucherContextActive(context)) return;
      toast.error(
        "Unable to confirm whether the Receipt was saved. Retry uses the same request.",
      );
    }
  };

  const handleCreateReceipt = async () => {
    if (
      isSubmittingRef.current ||
      isPreparing ||
      createReceiptMutation.isPending ||
      !userId ||
      createValidationError
    ) {
      if (createValidationError) toast.error(createValidationError);
      return;
    }

    isSubmittingRef.current = true;
    const context = createVoucherOperationContext(userId, companyId);
    try {
      if (receiptDraft.submittedPayload) {
        await submitFrozenPayload(receiptDraft.submittedPayload);
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
        if (isVoucherContextActive(context)) {
          toast.error(
            "Could not refresh Outstanding balances. The Receipt was not submitted.",
          );
        }
        return;
      }

      if (!isVoucherContextActive(context)) return;

      const staleError = getStaleReceiptAllocationError(
        receiptDraft.allocations,
        currentBills,
      );
      if (staleError) {
        if (!isVoucherContextActive(context)) return;
        dispatch(setReceiptAllocationProgress(receiptDraft.allocations));
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

  const handleStartNewReceipt = () => {
    // A conflict needs later attention in shared storage. Clearing the active
    // form must not discard that evidence or reuse its request ID.
    initializationRef.current = null;
    dispatch(clearReceiptDraft());
    toast.success("You can create a new Receipt with a fresh request ID.");
  };

  const fieldsDisabled = !companyId || isDraftLocked;
  const paymentFieldsDisabled =
    fieldsDisabled || receiptDraft.allocationStatus !== "confirmed";
  const hasRequestIdConflict =
    receiptDraft.submissionRecoveryState === "conflict";

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Create Receipt" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={formScrollViewRef}
          className="flex-1 px-4 pt-3"
          // Keep enough trailing space for the multiline Narration card to
          // scroll fully above Android's keyboard, not merely show its title.
          contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 250 : 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <VoucherCreateHeader
            title="Receipt"
            description="Choose the transaction date and Receipt voucher number."
            transactionDate={receiptDraft.transactionDate}
            onTransactionDateChange={(date) => dispatch(setReceiptDate(date))}
            isDateDisabled={fieldsDisabled}
          >
            {!companyId ? (
              <VoucherEmptyState message="Select a company first to load Receipt voucher series." />
            ) : isDraftLocked && receiptDraft.selectedSeries ? (
              <VoucherSeriesSelector
                selectedSeries={receiptDraft.selectedSeries}
                disabled
                onPress={() => undefined}
              />
            ) : seriesQuery.isLoading ? (
              <VoucherLoadingState message="Loading Receipt voucher series..." />
            ) : seriesQuery.isError ? (
              <VoucherErrorState
                message="Unable to load Receipt voucher series right now."
                onRetry={() => void seriesQuery.refetch()}
              />
            ) : !receiptDraft.selectedSeries ? (
              <VoucherEmptyState message="No Receipt voucher series were found for this company." />
            ) : (
              <VoucherSeriesSelector
                selectedSeries={receiptDraft.selectedSeries}
                disabled={isDraftLocked}
                onPress={() => setIsSeriesModalOpen(true)}
              />
            )}
          </VoucherCreateHeader>

          <View className="mt-4">
            <VoucherPartySelector
              selectedParty={receiptDraft.selectedParty}
              outstandingMode="receivable"
              disabled={fieldsDisabled}
              onPress={() => setIsPartyModalOpen(true)}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isDraftLocked}
            onPress={handleOpenAllocation}
            className={`mt-4 rounded-xl border p-5 ${
              receiptDraft.allocationStatus === "confirmed"
                ? "border-blue-200 bg-[#EAF2F8]"
                : "border-slate-200 bg-white"
            } ${isDraftLocked ? "opacity-60" : ""}`}
          >
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <ReceiptText color="#134074" size={20} strokeWidth={2.2} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[14px] font-extrabold text-slate-900">
                  Receipt Amount &amp; Settlement
                </Text>
                <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  {receiptDraft.allocationStatus === "confirmed"
                    ? "Allocation confirmed"
                    : receiptDraft.allocationStatus === "in_progress"
                      ? "Continue your in-progress allocation"
                      : "Enter amount and allocate bills"}
                </Text>
              </View>
              <ArrowRight color="#134074" size={19} strokeWidth={2.4} />
            </View>

            {receiptDraft.allocationStatus === "confirmed" ? (
              <View className="mt-4 border-t border-blue-200 pt-3">
                <View className="flex-row justify-between py-1">
                  <Text className="text-[12px] text-slate-600">Receipt amount</Text>
                  <Text className="text-[12px] font-bold text-slate-900">₹{receiptAmount.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-[12px] text-slate-600">Allocated amount</Text>
                  <Text className="text-[12px] font-bold text-slate-900">₹{totalSettled.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-[12px] text-slate-600">Advance</Text>
                  <Text className="text-[12px] font-bold text-slate-900">₹{advanceAmount.toFixed(2)}</Text>
                </View>
                {/* <Text className="mt-2 text-[11px] font-extrabold text-[#134074]">Allocation Confirmed ✓  •  Edit Settlement</Text> */}
              </View>
            ) : null}
          </Pressable>

          <View className="mt-4">
            <ReceiptInstrumentSection
              value={receiptDraft.instrumentType}
              disabled={paymentFieldsDisabled}
              onChange={(value) => dispatch(setReceiptInstrument(value))}
            />
          </View>

          <View className="mt-4">
            <ReceiptCashBankSection
              companyId={companyId}
              instrumentType={receiptDraft.instrumentType}
              selectedAccount={receiptDraft.selectedCashBank}
              disabled={paymentFieldsDisabled}
              onSelect={(account) => dispatch(setReceiptCashBank(account))}
            />
          </View>

          {receiptDraft.instrumentType === "cheque" ? (
            <View className="mt-4">
              <ReceiptChequeSection
                chequeNumber={receiptDraft.chequeNumber}
                chequeDate={receiptDraft.chequeDate}
                disabled={paymentFieldsDisabled}
                onChequeNumberChange={(chequeNumber) =>
                  dispatch(
                    setReceiptChequeDetails({
                      chequeNumber,
                      chequeDate: receiptDraft.chequeDate,
                    }),
                  )
                }
                onChequeDateChange={(chequeDate) =>
                  dispatch(
                    setReceiptChequeDetails({
                      chequeNumber: receiptDraft.chequeNumber,
                      chequeDate,
                    }),
                  )
                }
              />
            </View>
          ) : null}

          <Text className="ml-1 mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Optional details
          </Text>
          <View className="mb-4 mt-3">
            <ReceiptNarrationSection
              value={receiptDraft.narration}
              disabled={paymentFieldsDisabled}
              onChangeText={(value) => dispatch(setReceiptNarration(value))}
              onFocus={() => {
                isNarrationFocusedRef.current = true;
                scrollNarrationAboveKeyboard();
              }}
              onBlur={() => { isNarrationFocusedRef.current = false; }}
            />
          </View>

        </ScrollView>

        <View
          className="border-t border-slate-200 bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isDraftLocked ? "Retry Receipt submission" : "Create Receipt"}
            accessibilityState={{ disabled: Boolean(createValidationError) || isPreparing || createReceiptMutation.isPending }}
            disabled={Boolean(createValidationError) || isPreparing || createReceiptMutation.isPending}
            onPress={() => void handleCreateReceipt()}
            className={`min-h-14 flex-row items-center justify-center rounded-2xl bg-[#134074] px-5 ${createValidationError || isPreparing || createReceiptMutation.isPending ? "opacity-50" : ""}`}
          >
            {isPreparing || createReceiptMutation.isPending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : null}
            <Text
              className={`text-[15px] font-extrabold text-white ${
                isPreparing || createReceiptMutation.isPending ? "ml-2" : ""
              }`}
            >
              {isPreparing || createReceiptMutation.isPending
                ? "Creating Receipt..."
                : isDraftLocked
                  ? "Retry Receipt"
                  : "Create Receipt"}
            </Text>
          </Pressable>
          <Text className="mt-2 text-center text-[10px] text-slate-500">
            {isDraftLocked
              ? hasRequestIdConflict
                ? "This request ID belongs to a different Receipt. Start a new Receipt to continue."
                : "This retry keeps the original request ID and payload"
              : receiptDraft.allocationStatus === "confirmed"
                ? "Receipt is created immediately after allocation is checked"
                : "Confirm settlement before entering payment details"}
          </Text>
          {hasRequestIdConflict ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new Receipt"
              onPress={() => conflictRecoverySheetRef.current?.present()}
              className="mt-3 min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4"
            >
              <Text className="text-[13px] font-extrabold text-rose-700">
                Start new Receipt
              </Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {receiptDraft.selectedSeries ? (
        <VoucherSeriesModal
          visible={isSeriesModalOpen}
          voucherLabel="Receipt"
          series={series}
          selectedSeries={receiptDraft.selectedSeries}
          onClose={() => setIsSeriesModalOpen(false)}
          onConfirm={handleConfirmSeries}
        />
      ) : null}

      <VoucherPartyModal
        visible={isPartyModalOpen}
        companyId={companyId}
        selectedParty={receiptDraft.selectedParty}
        partyType="party"
        onClose={() => setIsPartyModalOpen(false)}
        onConfirm={handleConfirmParty}
      />
      <DiscardDraftSheet
        sheetRef={discardDraftSheetRef}
        voucherLabel="Receipt"
        onConfirm={() => pendingBackActionRef.current?.()}
      />
      <DiscardDraftSheet
        sheetRef={conflictRecoverySheetRef}
        voucherLabel="Receipt"
        title="Start a new Receipt?"
        description="The server rejected this retry because its request ID belongs to a different Receipt. Starting new clears this locked draft only and uses a fresh request ID."
        confirmLabel="Start new Receipt"
        cancelLabel="Keep locked Receipt"
        onConfirm={() => void handleStartNewReceipt()}
      />
    </View>
  );
}
