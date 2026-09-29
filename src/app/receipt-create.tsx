import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useNavigation, useRouter } from "expo-router";
import { ArrowRight, LockKeyhole, ReceiptText } from "lucide-react-native";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ReceiptCashBankSection } from "@/components/receipt-create/ReceiptCashBankSection";
import { ReceiptChequeSection } from "@/components/receipt-create/ReceiptChequeSection";
import { ReceiptConfirmationSheet } from "@/components/receipt-create/ReceiptConfirmationSheet";
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
import { useVoucherSeriesListQuery } from "@/hooks/queries/voucherQueries";
import { receiptSubmissionRecoveryService } from "@/services/receiptSubmissionRecovery.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearReceiptDraft,
  initializeReceiptDraft,
  restoreReceiptSubmission,
  setReceiptCashBank,
  setReceiptChequeDetails,
  setReceiptDate,
  setReceiptInstrument,
  setReceiptNarration,
  setReceiptParty,
  setReceiptSeries,
} from "@/store/receiptDraftSlice";
import type { Party } from "@/types/party";
import type { VoucherSeriesItem } from "@/types/voucher";
import {
  calculateReceiptRemainingAmount,
  calculateReceiptTotalSettled,
  getReceiptReviewValidationError,
  type ReceiptReviewDraftInput,
} from "@/utils/receipt";
import { createReceiptRequestId } from "@/utils/receiptRequestId";
import { getTodayDateString } from "@/utils/voucher";

type DraftInitialization = {
  companyId: string;
  requestId: string;
};

export default function ReceiptCreateScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  const recoveryScope = `${userId}:${companyId}`;
  const [checkedRecoveryScope, setCheckedRecoveryScope] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const confirmationSheetRef = useRef<BottomSheetModal>(null);
  const discardDraftSheetRef = useRef<BottomSheetModal>(null);
  const isDraftLocked = receiptDraft.submittedPayload !== null;
  const isDraftLockedRef = useRef(isDraftLocked);
  const isBackConfirmedRef = useRef(false);
  const pendingBackActionRef = useRef<(() => void) | null>(null);
  isDraftLockedRef.current = isDraftLocked;

  useEffect(() => {
    // Returning from Receipt Create abandons a normal draft, matching Sale and
    // Sale Order creation. A frozen submission must remain for safe retry.
    return navigation.addListener("beforeRemove", (event) => {
      if (isDraftLockedRef.current || isBackConfirmedRef.current) {
        return;
      }

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
    let isCancelled = false;
    setIsSeriesModalOpen(false);
    setIsPartyModalOpen(false);
    setCheckedRecoveryScope("");
    setRecoveryError(null);

    if (!companyId || !userId) {
      initializationRef.current = null;
      dispatch(clearReceiptDraft());
      setCheckedRecoveryScope(recoveryScope);
      return;
    }

    if (
      receiptDraft.companyId === companyId &&
      receiptDraft.submittedPayload
    ) {
      initializationRef.current = {
        companyId,
        requestId: receiptDraft.submittedPayload.request_id,
      };
      setCheckedRecoveryScope(recoveryScope);
      return;
    }

    async function prepareDraft() {
      try {
        const recovery = await receiptSubmissionRecoveryService.load(
          userId,
          companyId,
        );
        if (isCancelled) return;

        if (recovery) {
          initializationRef.current = {
            companyId,
            requestId: recovery.payload.request_id,
          };
          dispatch(restoreReceiptSubmission(recovery));
        } else {
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
        }

        setCheckedRecoveryScope(recoveryScope);
      } catch {
        if (isCancelled) return;
        // Do not create a new logical Receipt when durable recovery could not
        // be checked; an earlier request may still exist under this scope.
        setRecoveryError(
          "Could not check for an unfinished Receipt submission. Try again before creating a new Receipt.",
        );
        setCheckedRecoveryScope(recoveryScope);
      }
    }

    void prepareDraft();
    return () => {
      isCancelled = true;
    };
  }, [
    companyId,
    dispatch,
    receiptDraft.companyId,
    receiptDraft.submittedPayload,
    recoveryAttempt,
    recoveryScope,
    userId,
  ]);

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

  const handleCreateReceipt = () => {
    if (createValidationError) {
      toast.error(createValidationError);
      return;
    }
    confirmationSheetRef.current?.present();
  };

  const isDraftReady =
    checkedRecoveryScope === recoveryScope &&
    (!companyId ||
      (receiptDraft.companyId === companyId && Boolean(receiptDraft.requestId)));

  if (!isDraftReady) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Create Receipt" />
        <PageLoader message="Preparing Receipt..." />
      </View>
    );
  }

  if (recoveryError) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Create Receipt" />
        <PageError
          title="Receipt recovery is unavailable"
          description={recoveryError}
          onRetry={() => setRecoveryAttempt((attempt) => attempt + 1)}
        />
      </View>
    );
  }

  const fieldsDisabled = !companyId || isDraftLocked;
  const paymentFieldsDisabled =
    fieldsDisabled || receiptDraft.allocationStatus !== "confirmed";

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Create Receipt" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-4 pt-3"
          contentContainerStyle={{ paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isDraftLocked ? (
            <View className="mb-4 flex-row rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <LockKeyhole color="#b45309" size={18} strokeWidth={2.2} />
              <Text className="ml-3 flex-1 text-[12px] leading-5 text-amber-800">
                This Receipt is locked because a submission may already be in
                progress. Its details cannot be changed.
              </Text>
            </View>
          ) : null}

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
            accessibilityState={{ disabled: Boolean(createValidationError) }}
            disabled={Boolean(createValidationError)}
            onPress={handleCreateReceipt}
            className={`min-h-14 flex-row items-center justify-center rounded-2xl bg-[#134074] px-5 ${createValidationError ? "opacity-50" : ""}`}
          >
            <Text className="text-[15px] font-extrabold text-white">
              {isDraftLocked
                ? "Retry Same Receipt"
                : "Create Receipt"}
            </Text>
            <View className="ml-2">
              <ArrowRight color="#ffffff" size={19} strokeWidth={2.4} />
            </View>
          </Pressable>
          <Text className="mt-2 text-center text-[10px] text-slate-500">
            {isDraftLocked
              ? "This retry keeps the original request ID and payload"
              : receiptDraft.allocationStatus === "confirmed"
                ? "A final confirmation is required before creation"
                : "Confirm settlement before entering payment details"}
          </Text>
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
      <ReceiptConfirmationSheet sheetRef={confirmationSheetRef} />
      <DiscardDraftSheet
        sheetRef={discardDraftSheetRef}
        voucherLabel="Receipt"
        onConfirm={() => pendingBackActionRef.current?.()}
      />
    </View>
  );
}
