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
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ArrowRight, LockKeyhole, ReceiptText } from "lucide-react-native";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ReceiptAmountSection } from "@/components/receipt-create/ReceiptAmountSection";
import { ReceiptCashBankSection } from "@/components/receipt-create/ReceiptCashBankSection";
import { ReceiptChequeSection } from "@/components/receipt-create/ReceiptChequeSection";
import { ReceiptInstrumentSection } from "@/components/receipt-create/ReceiptInstrumentSection";
import { ReceiptNarrationSection } from "@/components/receipt-create/ReceiptNarrationSection";
import { ReceiptEditStaleSheet } from "@/components/receipt-edit/ReceiptEditStaleSheet";
import { VoucherCreateHeader } from "@/components/voucher-create/VoucherCreateHeader";
import { VoucherSeriesSelector } from "@/components/voucher-create/VoucherSeriesSelector";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { cashBankQueryKeys } from "@/hooks/queries/cashBankQueries";
import {
  receiptQueryKeys,
  useReceiptDetailQuery,
  useUpdateReceiptMutation,
} from "@/hooks/queries/receiptQueries";
import { voucherTotalsSummaryQueryKeys } from "@/hooks/queries/voucherQueries";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearReceiptEdit,
  initializeReceiptEdit,
  setReceiptEditCashBank,
  setReceiptEditChequeDetails,
  setReceiptEditDate,
  setReceiptEditInstrument,
  setReceiptEditNarration,
} from "@/store/receiptEditSlice";
import type { Party } from "@/types/party";
import type { VoucherSeriesItem } from "@/types/voucher";
import {
  buildReceiptEditPayload,
  calculateReceiptRemainingAmount,
  calculateReceiptTotalSettled,
  getReceiptEditValidationError,
  type ReceiptEditPayloadInput,
} from "@/utils/receipt";

function formatMoney(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : "Could not update Receipt";
}

export default function ReceiptEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const edit = useAppSelector((state) => state.receiptEdit);
  const receiptId = params.id ?? "";
  const companyId = selectedCompany?._id ?? "";
  const receiptQuery = useReceiptDetailQuery(receiptId, companyId);
  const updateMutation = useUpdateReceiptMutation();
  const staleSheetRef = useRef<BottomSheetModal>(null);
  const formScrollViewRef = useRef<ScrollView>(null);
  const isNarrationFocusedRef = useRef(false);
  const successfulExitRef = useRef(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const isReady =
    Boolean(receiptId) &&
    Boolean(companyId) &&
    edit.receiptId === receiptId &&
    edit.companyId === companyId;

  useEffect(() => {
    if (!receiptQuery.data) return;
    if (edit.companyId && edit.companyId !== companyId) {
      dispatch(clearReceiptEdit());
      return;
    }
    if (edit.receiptId === receiptId && edit.companyId === companyId) return;
    dispatch(initializeReceiptEdit({ companyId, receipt: receiptQuery.data }));
  }, [companyId, dispatch, edit.companyId, edit.receiptId, receiptId, receiptQuery.data]);

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      if (!successfulExitRef.current) dispatch(clearReceiptEdit());
    });
  }, [dispatch, navigation]);

  const scrollNarrationAboveKeyboard = () => {
    setTimeout(() => formScrollViewRef.current?.scrollToEnd({ animated: true }), 80);
  };

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
      if (isNarrationFocusedRef.current) scrollNarrationAboveKeyboard();
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const selectedAccount = useMemo<Party | null>(() => {
    if (!edit.cashBankId || !edit.cashBankType) return null;
    return {
      _id: edit.cashBankId,
      partyName: edit.cashBankName ?? "",
      partyType: edit.cashBankType,
    };
  }, [edit.cashBankId, edit.cashBankName, edit.cashBankType]);
  const receiptSeries = useMemo<VoucherSeriesItem>(
    () => ({
      _id: edit.seriesId,
      seriesName: edit.seriesName,
    }),
    [edit.seriesId, edit.seriesName],
  );

  const payloadInput = useMemo<ReceiptEditPayloadInput>(
    () => ({
      companyId,
      draftCompanyId: edit.companyId,
      receiptId: edit.receiptId,
      mode: edit.mode,
      expectedUpdatedAt: edit.expectedUpdatedAt,
      transactionDate: edit.transactionDate,
      partyId: edit.partyId,
      partyName: edit.partyName,
      receiptAmount: edit.amount,
      cashBankId: edit.cashBankId,
      cashBankName: edit.cashBankName,
      cashBankType: edit.cashBankType,
      instrumentType: edit.instrumentType,
      chequeNumber: edit.chequeNumber,
      chequeDate: edit.chequeDate,
      narration: edit.narration,
      historicalSettlements: edit.historicalSettlements,
      allocations: edit.allocations,
      allocationStatus: edit.allocationStatus,
    }),
    [companyId, edit],
  );
  const validationError = isReady
    ? getReceiptEditValidationError(payloadInput)
    : "Receipt Edit is loading";
  const activeAllocations =
    edit.mode === "snapshot" ? edit.originalAllocations : edit.allocations;
  const totalSettled = calculateReceiptTotalSettled(activeAllocations);
  const advanceAmount = calculateReceiptRemainingAmount(
    Number(edit.amount) || 0,
    activeAllocations,
  );

  const handleOpenAllocation = () => {
    router.push("/receipt-edit-allocation");
  };

  const handleReload = async () => {
    try {
      const result = await receiptQuery.refetch();
      if (!result.data) {
        toast.error("Could not reload the latest Receipt");
        return;
      }
      if (result.data.status === "cancelled") {
        dispatch(clearReceiptEdit());
        staleSheetRef.current?.dismiss();
        toast.error("This Receipt was cancelled and can no longer be edited");
        router.replace({
          pathname: "/receipt-detail",
          params: { id: result.data._id },
        });
        return;
      }
      dispatch(initializeReceiptEdit({ companyId, receipt: result.data }));
      staleSheetRef.current?.dismiss();
      toast.success("Latest Receipt loaded");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleUpdate = async () => {
    if (!edit.receiptId || updateMutation.isPending) return;

    if (validationError) {
      toast.error(validationError);
      if (edit.mode === "reallocation" && edit.allocationStatus !== "confirmed") {
        router.push("/receipt-edit-allocation");
      }
      return;
    }

    try {
      const payload = buildReceiptEditPayload(payloadInput);
      const response = await updateMutation.mutateAsync({
        receiptId: edit.receiptId,
        companyId,
        payload,
      });
      const updatedReceipt = response.data.cashTransaction;

      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vouchers }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.daybook }),
        queryClient.invalidateQueries({
          queryKey: voucherTotalsSummaryQueryKeys.company(companyId),
        }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.outstanding }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties }),
        queryClient.invalidateQueries({ queryKey: cashBankQueryKeys.all }),
      ]);

      successfulExitRef.current = true;
      dispatch(clearReceiptEdit());
      toast.success(`Receipt ${updatedReceipt.voucher_number} updated`);
      router.back();
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message?.toLowerCase() ?? ""
        : "";
      if (message.includes("cancelled receipt")) {
        await handleReload();
        return;
      }
      if (isAxiosError(error) && error.response?.status === 409) {
        staleSheetRef.current?.present();
        return;
      }
      toast.error(getErrorMessage(error));
    }
  };

  if (!receiptId || !companyId) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Receipt" />
        <PageError
          title="Receipt is not available"
          description="Open this Receipt again from its detail screen."
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  if (receiptQuery.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Receipt" />
        <PageLoader message="Loading Receipt snapshot..." />
      </View>
    );
  }

  if (receiptQuery.isError || !receiptQuery.data) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Receipt" />
        <PageError
          title="Could not load Receipt"
          description="The Receipt may be unavailable or you may not have access."
          onRetry={() => void receiptQuery.refetch()}
        />
      </View>
    );
  }

  if (!isReady) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Receipt" />
        <PageLoader message="Preparing Receipt Edit..." />
      </View>
    );
  }

  if (receiptQuery.data.status !== "active") {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Receipt" />
        <PageError
          title="Cancelled Receipt"
          description="A cancelled Receipt cannot be edited."
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Edit Receipt" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={formScrollViewRef}
          className="flex-1 px-4 pt-3"
          contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 250 : 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <VoucherCreateHeader
            title="Receipt"
            description="Choose the transaction date and Receipt voucher number."
            transactionDate={edit.transactionDate}
            onTransactionDateChange={(date) => dispatch(setReceiptEditDate(date))}
          >
            <VoucherSeriesSelector
              selectedSeries={receiptSeries}
              displayNumber={edit.voucherNumber}
              disabled
              onPress={() => undefined}
            />
          </VoucherCreateHeader>

          <View className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                <LockKeyhole color="#475569" size={19} strokeWidth={2.2} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Party • Read only
                </Text>
                <Text className="mt-1 text-[15px] font-extrabold text-slate-900">
                  {edit.partyName}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-4">
            <ReceiptAmountSection
              value={edit.amount}
              onChangeText={() => undefined}
              disabled
              readOnly
            />
          </View>

          <View className="mt-4">
            <Pressable
              accessibilityRole="button"
              onPress={handleOpenAllocation}
              className={`rounded-xl border p-5 ${
                edit.mode === "snapshot" || edit.allocationStatus === "confirmed"
                  ? "border-blue-200 bg-[#EAF2F8]"
                  : "border-amber-200 bg-amber-50"
              }`}
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
                    {edit.mode === "snapshot"
                      ? "Review saved bill allocation"
                      : edit.allocationStatus === "confirmed"
                        ? "Allocation confirmed"
                        : "Continue your current allocation"}
                  </Text>
                </View>
                <ArrowRight color="#134074" size={19} strokeWidth={2.4} />
              </View>

              <View className="mt-4 border-t border-blue-200 pt-3">
                <View className="flex-row justify-between py-1">
                  <Text className="text-[12px] text-slate-600">Receipt amount</Text>
                  <Text className="text-[12px] font-bold text-slate-900">
                    {formatMoney(Number(edit.amount) || 0)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-[12px] text-slate-600">Allocated amount</Text>
                  <Text className="text-[12px] font-bold text-slate-900">
                    {formatMoney(totalSettled)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-[12px] text-slate-600">Advance</Text>
                  <Text className="text-[12px] font-bold text-slate-900">
                    {formatMoney(advanceAmount)}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>

          <View className="mt-4">
            <ReceiptInstrumentSection
              value={edit.instrumentType}
              onChange={(value) => dispatch(setReceiptEditInstrument(value))}
            />
          </View>
          <View className="mt-4">
            <ReceiptCashBankSection
              companyId={companyId}
              instrumentType={edit.instrumentType}
              selectedAccount={selectedAccount}
              onSelect={(account) => dispatch(setReceiptEditCashBank(account))}
            />
          </View>
          {edit.instrumentType === "cheque" ? (
            <View className="mt-4">
              <ReceiptChequeSection
                chequeNumber={edit.chequeNumber}
                chequeDate={edit.chequeDate}
                onChequeNumberChange={(chequeNumber) =>
                  dispatch(
                    setReceiptEditChequeDetails({
                      chequeNumber,
                      chequeDate: edit.chequeDate,
                    }),
                  )
                }
                onChequeDateChange={(chequeDate) =>
                  dispatch(
                    setReceiptEditChequeDetails({
                      chequeNumber: edit.chequeNumber,
                      chequeDate,
                    }),
                  )
                }
              />
            </View>
          ) : null}

          <View className="mb-4 mt-4">
            <ReceiptNarrationSection
              value={edit.narration}
              onChangeText={(value) => dispatch(setReceiptEditNarration(value))}
              onFocus={() => {
                isNarrationFocusedRef.current = true;
                scrollNarrationAboveKeyboard();
              }}
              onBlur={() => {
                isNarrationFocusedRef.current = false;
              }}
            />
          </View>
        </ScrollView>

        <View
          className="border-t border-slate-200 bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Pressable
            accessibilityRole="button"
            disabled={updateMutation.isPending}
            onPress={() => void handleUpdate()}
            className={`min-h-14 flex-row items-center justify-center rounded-2xl bg-[#134074] px-5 ${
              updateMutation.isPending ? "opacity-60" : ""
            }`}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <ReceiptText color="#ffffff" size={19} strokeWidth={2.3} />
            )}
            <Text className="ml-2 text-[15px] font-extrabold text-white">
              {updateMutation.isPending ? "Updating Receipt..." : "Update Receipt"}
            </Text>
          </Pressable>
          <Text className="mt-2 text-center text-[10px] text-slate-500">
            {edit.mode === "snapshot"
              ? "Original allocations stay unchanged unless you reset them"
              : "The complete confirmed allocation will replace the current one"}
          </Text>
        </View>
      </KeyboardAvoidingView>

      <ReceiptEditStaleSheet
        sheetRef={staleSheetRef}
        isLoading={receiptQuery.isFetching}
        onReload={() => void handleReload()}
      />
    </View>
  );
}
