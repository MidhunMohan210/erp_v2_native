import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { isAxiosError } from "axios";
import { useNavigation, useRouter } from "expo-router";
import { ArrowRight, ReceiptText, UserRound } from "lucide-react-native";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { PageError } from "@/components/feedback/PageError";
import { ReceiptAmountSection } from "@/components/receipt-create/ReceiptAmountSection";
import { ReceiptOutstandingBillCard } from "@/components/receipt-create/ReceiptOutstandingBillCard";
import { ReceiptEditResetSheet } from "@/components/receipt-edit/ReceiptEditResetSheet";
import {
  ReceiptHistoricalAllocationCard,
  ReceiptHistoricalAllocationHeader,
} from "@/components/receipt-edit/ReceiptHistoricalAllocations";
import { useReceiptEditReallocation } from "@/hooks/useReceiptEditReallocation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setReceiptEditAllocationProgress,
  setReceiptEditAllocations,
  setReceiptEditAmount,
} from "@/store/receiptEditSlice";
import type { ReceiptAllocation, ReceiptSettlementDetail } from "@/types/receipt";
import {
  allocateReceiptOldestFirst,
  calculateReceiptRemainingAmount,
  calculateReceiptTotalSettled,
  getNextReceiptAmountInput,
  getReceiptConfirmationValidationError,
  getReceiptEditBills,
  redistributeSelectedReceiptBills,
  sortReceiptEditAvailabilityFifo,
  sortReceiptSettlementsFifo,
} from "@/utils/receipt";

function formatMoney(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getAllocationSignature(allocations: ReceiptAllocation[]): string {
  return allocations
    .map((item) => `${item.outstandingId}:${item.settledAmount.toFixed(2)}`)
    .join("|");
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error
    ? error.message
    : "Could not load current allocation availability";
}

export default function ReceiptEditAllocationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const edit = useAppSelector((state) => state.receiptEdit);
  const companyId = selectedCompany?._id ?? "";
  const reallocation = useReceiptEditReallocation(companyId);
  const resetSheetRef = useRef<BottomSheetModal>(null);
  const receiptAmount = Number(edit.amount) || 0;
  const [selectedIds, setSelectedIds] = useState(() =>
    edit.allocations.map((item) => item.outstandingId),
  );
  const [preserveSavedAmounts, setPreserveSavedAmounts] = useState(true);
  const skipBackCommitRef = useRef(false);
  const originalSignatureRef = useRef(getAllocationSignature(edit.allocations));
  const initializedVersionRef = useRef(
    edit.mode === "reallocation" ? edit.expectedUpdatedAt : null,
  );

  const isContextValid =
    Boolean(edit.receiptId) &&
    Boolean(companyId) &&
    edit.companyId === companyId;
  const fifoItems = useMemo(
    () => sortReceiptEditAvailabilityFifo(edit.availabilityItems),
    [edit.availabilityItems],
  );
  const historicalSettlements = useMemo(
    () => sortReceiptSettlementsFifo(edit.historicalSettlements),
    [edit.historicalSettlements],
  );
  const savedAllocationById = useMemo(
    () => new Map(edit.allocations.map((item) => [item.outstandingId, item])),
    [edit.allocations],
  );
  const editableBills = useMemo(
    () => getReceiptEditBills(fifoItems),
    [fifoItems],
  );
  const allocatedBills = useMemo(() => {
    if (!preserveSavedAmounts) {
      return redistributeSelectedReceiptBills(
        receiptAmount,
        editableBills.map((bill) => ({
          bill,
          selected: selectedIds.includes(bill._id),
          settledAmount: 0,
          remainingAmount: Number(bill.bill_pending_amt) || 0,
        })),
      );
    }

    let receiptRemaining = receiptAmount;
    return editableBills.map((bill) => {
      const available = Number(bill.bill_pending_amt) || 0;
      const savedAmount = savedAllocationById.get(bill._id)?.settledAmount ?? 0;
      const settledAmount = selectedIds.includes(bill._id)
        ? Math.min(savedAmount, available, receiptRemaining)
        : 0;
      receiptRemaining = Math.max(receiptRemaining - settledAmount, 0);
      return {
        bill,
        selected: settledAmount > 0,
        settledAmount,
        remainingAmount: Math.max(available - settledAmount, 0),
      };
    });
  }, [
    editableBills,
    preserveSavedAmounts,
    receiptAmount,
    savedAllocationById,
    selectedIds,
  ]);
  const allocations = useMemo<ReceiptAllocation[]>(
    () =>
      allocatedBills
        .filter((item) => item.selected && item.settledAmount > 0)
        .map((item) => ({
          outstandingId: item.bill._id,
          settledAmount: item.settledAmount,
          confirmedPendingAmount: Number(item.bill.bill_pending_amt) || 0,
          billNumber: item.bill.bill_no,
          billDate: item.bill.bill_date,
        })),
    [allocatedBills],
  );
  const totalSettled = calculateReceiptTotalSettled(allocations);
  const remainingAmount = calculateReceiptRemainingAmount(
    receiptAmount,
    allocations,
  );
  const latestAllocationsRef = useRef(allocations);
  latestAllocationsRef.current = allocations;

  useEffect(() => {
    if (
      edit.mode !== "reallocation" ||
      initializedVersionRef.current === edit.expectedUpdatedAt
    ) {
      return;
    }

    initializedVersionRef.current = edit.expectedUpdatedAt;
    setSelectedIds(edit.allocations.map((item) => item.outstandingId));
    setPreserveSavedAmounts(true);
    originalSignatureRef.current = getAllocationSignature(edit.allocations);
  }, [
    edit.allocations,
    edit.expectedUpdatedAt,
    edit.mode,
  ]);

  const commitProgressOnExit = useCallback(() => {
    if (
      skipBackCommitRef.current ||
      !isContextValid ||
      edit.mode !== "reallocation"
    ) {
      return;
    }
    if (
      getAllocationSignature(latestAllocationsRef.current) !==
      originalSignatureRef.current
    ) {
      dispatch(setReceiptEditAllocationProgress(latestAllocationsRef.current));
    }
  }, [dispatch, edit.mode, isContextValid]);

  useEffect(
    () => navigation.addListener("beforeRemove", commitProgressOnExit),
    [commitProgressOnExit, navigation],
  );

  const handleAmountChange = (nextValue: string) => {
    const safeValue = getNextReceiptAmountInput(edit.amount, nextValue);

    // An amount change starts a new FIFO distribution. This must consider all
    // current Edit bills, not only the bills selected before the amount changed.
    const automaticSelection = allocateReceiptOldestFirst(
      Number(safeValue) || 0,
      editableBills,
    );
    setPreserveSavedAmounts(false);
    setSelectedIds(
      automaticSelection
        .filter((item) => item.selected)
        .map((item) => item.bill._id),
    );
    dispatch(setReceiptEditAmount(safeValue));
  };

  const handleToggle = (billId: string) => {
    const selected = selectedIds.includes(billId);
    if (!selected && remainingAmount <= 0) return;
    setPreserveSavedAmounts(false);
    setSelectedIds((current) =>
      selected
        ? current.filter((id) => id !== billId)
        : [...current, billId],
    );
  };

  const handleConfirm = () => {
    const validationError = getReceiptConfirmationValidationError({
      receiptAmount,
      allocations,
      loadedBills: editableBills,
      hasMore: false,
      isLoading: false,
      hasError: false,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    skipBackCommitRef.current = true;
    dispatch(setReceiptEditAllocations(allocations));
    router.back();
  };

  const handleContinueReallocation = async () => {
    try {
      await reallocation.loadLatestAvailability();
      resetSheetRef.current?.dismiss();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (!isContextValid) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Receipt Allocation" />
        <PageError
          title="Receipt Edit is not ready"
          description="Return to the Receipt and load current allocation availability first."
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  if (edit.mode === "snapshot") {
    return (
      <View className="flex-1 bg-slate-50">
        <ScreenHeader
          title="Receipt Allocation"
          onBack={() => router.back()}
        />
        <View className="flex-1 px-4 pt-3">
          <View className="rounded-3xl bg-[#134074] p-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <UserRound color="#ffffff" size={20} strokeWidth={2.2} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                  Locked party
                </Text>
                <Text className="mt-0.5 text-[15px] font-extrabold text-white">
                  {edit.partyName}
                </Text>
              </View>
            </View>
            <View className="mt-4 flex-row items-center justify-between border-t border-white/15 pt-3">
              <Text className="text-[11px] font-semibold text-blue-100">
                Receipt Amount
              </Text>
              <Text className="text-[18px] font-extrabold text-white">
                {formatMoney(receiptAmount)}
              </Text>
            </View>
          </View>

          <View className="mb-3 mt-4 rounded-3xl bg-white p-5 shadow-sm">
            <ReceiptHistoricalAllocationHeader />
          </View>

          <FlatList<ReceiptSettlementDetail>
            className="flex-1"
            data={historicalSettlements}
            keyExtractor={(item) => item._id || item.outstanding}
            contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
            renderItem={({ item }) => (
              <ReceiptHistoricalAllocationCard settlement={item} />
            )}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="rounded-2xl bg-white p-5 shadow-sm">
                <Text className="text-[12px] leading-5 text-slate-500">
                  This Receipt did not allocate an Outstanding bill.
                </Text>
              </View>
            }
          />
        </View>

        <View
          className="border-t border-slate-200 bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 10) }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change bill allocation"
            onPress={() => resetSheetRef.current?.present()}
            className="min-h-14 items-center justify-center rounded-2xl bg-[#134074] px-5"
          >
            <Text className="text-[15px] font-extrabold text-white">
              Change Bill Allocation
            </Text>
          </Pressable>
          <Text className="mt-2 text-center text-[10px] text-slate-500">
            Review this Receipt&apos;s saved allocations before loading current balances
          </Text>
        </View>

        <ReceiptEditResetSheet
          sheetRef={resetSheetRef}
          isLoading={reallocation.isLoading}
          onCancel={() => undefined}
          onContinue={() => void handleContinueReallocation()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Edit Receipt Allocation" onBack={() => router.back()} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="px-4 pt-3">
          <View className="rounded-3xl bg-[#134074] p-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <UserRound color="#ffffff" size={20} strokeWidth={2.2} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                  Locked party
                </Text>
                <Text className="mt-0.5 text-[15px] font-extrabold text-white">
                  {edit.partyName}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-[11px] text-blue-100">
              {formatMoney(totalSettled)} allocated • {formatMoney(remainingAmount)} advance
            </Text>
          </View>
          <View className="mt-3">
            <ReceiptAmountSection
              value={edit.amount}
              onChangeText={handleAmountChange}
            />
          </View>
          <View className="mb-2 mt-4">
            <Text className="text-[15px] font-extrabold text-slate-900">
              Bills available for this Edit
            </Text>
            <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
              Select bills. Allocated amounts always follow oldest bill first.
            </Text>
          </View>
        </View>

        <FlatList
          className="flex-1 px-4"
          data={allocatedBills}
          keyExtractor={(item) => item.bill._id}
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
          renderItem={({ item }) => (
            <ReceiptOutstandingBillCard
              item={item}
              disabled={!item.selected && remainingAmount <= 0}
              onToggle={handleToggle}
            />
          )}
          ListEmptyComponent={
            <View className="items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-9">
              <ReceiptText color="#047857" size={22} strokeWidth={2.2} />
              <Text className="mt-3 text-[14px] font-extrabold text-slate-900">
                No bills available for this Edit
              </Text>
              <Text className="mt-1 text-center text-[12px] leading-5 text-slate-500">
                The Receipt amount will remain an advance unless bills become available.
              </Text>
            </View>
          }
        />

        <View
          className="border-t border-slate-200 bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 10) }}
        >
          <View className="mb-3 flex-row justify-between">
            <Text className="text-[11px] font-semibold text-slate-600">
              Allocated {formatMoney(totalSettled)}
            </Text>
            <Text className="text-[11px] font-semibold text-slate-600">
              Advance {formatMoney(remainingAmount)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={receiptAmount <= 0}
            onPress={handleConfirm}
            className={`min-h-14 flex-row items-center justify-center rounded-2xl bg-[#134074] px-5 ${
              receiptAmount <= 0 ? "opacity-45" : ""
            }`}
          >
            <Text className="text-[15px] font-extrabold text-white">
              Confirm Allocation
            </Text>
            <ArrowRight color="#ffffff" size={19} strokeWidth={2.4} className="ml-2" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
