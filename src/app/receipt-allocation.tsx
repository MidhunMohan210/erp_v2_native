import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { ArrowRight, ReceiptText, UserRound } from "lucide-react-native";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { PageError } from "@/components/feedback/PageError";
import { ReceiptAmountSection } from "@/components/receipt-create/ReceiptAmountSection";
import { ReceiptOutstandingBillCard } from "@/components/receipt-create/ReceiptOutstandingBillCard";
import { useInfiniteReceiptOutstandingQuery } from "@/hooks/queries/outstandingQueries";
import { usePartyByIdQuery } from "@/hooks/queries/partyQueries";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setReceiptAllocationProgress,
  setReceiptAllocations,
  setReceiptAmount,
} from "@/store/receiptDraftSlice";
import type { OutstandingBill } from "@/types/outstanding";
import type { ReceiptAllocation } from "@/types/receipt";
import {
  allocateReceiptOldestFirst,
  calculateReceiptAdvancePreview,
  calculateReceiptRemainingAmount,
  calculateReceiptTotalSettled,
  getReceiptConfirmationValidationError,
  getReceiptOutstandingDisplay,
  redistributeSelectedReceiptBills,
} from "@/utils/receipt";

function formatMoney(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getAllocationSignature(allocations: ReceiptAllocation[]): string {
  return allocations
    .map(
      (allocation) =>
        `${allocation.outstandingId}:${allocation.settledAmount.toFixed(2)}`,
    )
    .join("|");
}

function formatNetOutstanding(value: number): string {
  const classification = value < 0 ? "CR" : "DR";
  return `${formatMoney(Math.abs(value))} ${classification}`;
}

export default function ReceiptAllocationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const receiptDraft = useAppSelector((state) => state.receiptDraft);
  const companyId = selectedCompany?._id ?? "";
  const partyId = receiptDraft.selectedParty?._id ?? "";
  const receiptAmount = Number(receiptDraft.receiptAmount) || 0;
  const isDraftLocked = receiptDraft.submittedPayload !== null;
  const contextKey = `${companyId}:${partyId}:${receiptDraft.receiptAmount}`;
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>(() =>
    receiptDraft.allocations.map((allocation) => allocation.outstandingId),
  );
  const contextKeyRef = useRef(contextKey);
  const manualSelectionRef = useRef(
    receiptDraft.allocationStatus !== "not_started",
  );
  const selectionTouchedRef = useRef(false);
  const skipBackCommitRef = useRef(false);
  const originalSignatureRef = useRef(
    getAllocationSignature(receiptDraft.allocations),
  );

  const isContextValid =
    Boolean(companyId) &&
    receiptDraft.companyId === companyId &&
    receiptDraft.selectedParty?.partyType === "party";

  const outstandingQuery = useInfiniteReceiptOutstandingQuery({
    cmp_id: companyId,
    partyId,
    enabled: isContextValid && !isDraftLocked,
  });
  const partyBalanceQuery = usePartyByIdQuery(partyId, isContextValid);
  const {
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
  } = outstandingQuery;

  const eligibleBills = useMemo(() => {
    const bills =
      outstandingQuery.data?.pages.flatMap((page) => page.items) ?? [];
    const uniqueBills = new Map<string, OutstandingBill>();

    for (const bill of bills) {
      const pendingAmount = Number(bill.bill_pending_amt) || 0;
      if (
        !uniqueBills.has(bill._id) &&
        bill.classification === "dr" &&
        pendingAmount > 0
      ) {
        uniqueBills.set(bill._id, bill);
      }
    }

    return Array.from(uniqueBills.values());
  }, [outstandingQuery.data]);

  useEffect(() => {
    if (contextKeyRef.current === contextKey) return;

    contextKeyRef.current = contextKey;
    setSelectedBillIds(
      receiptDraft.allocations.map((allocation) => allocation.outstandingId),
    );
    manualSelectionRef.current =
      receiptDraft.allocationStatus !== "not_started";
    selectionTouchedRef.current = false;
    originalSignatureRef.current = getAllocationSignature(
      receiptDraft.allocations,
    );
  }, [contextKey, receiptDraft.allocationStatus, receiptDraft.allocations]);

  useEffect(() => {
    if (
      manualSelectionRef.current ||
      eligibleBills.length === 0 ||
      receiptAmount <= 0
    ) {
      return;
    }

    const automaticAllocation = allocateReceiptOldestFirst(
      receiptAmount,
      eligibleBills,
    );
    setSelectedBillIds(
      automaticAllocation
        .filter((item) => item.selected)
        .map((item) => item.bill._id),
    );
  }, [eligibleBills, receiptAmount]);

  const allocatedBills = useMemo(
    () =>
      redistributeSelectedReceiptBills(
        receiptAmount,
        eligibleBills.map((bill) => ({
          bill,
          selected: selectedBillIds.includes(bill._id),
          settledAmount: 0,
          remainingAmount: Number(bill.bill_pending_amt) || 0,
        })),
      ),
    [eligibleBills, receiptAmount, selectedBillIds],
  );
  const loadedBillIds = useMemo(
    () => new Set(eligibleBills.map((bill) => bill._id)),
    [eligibleBills],
  );
  const unresolvedSelectedBillIds = selectedBillIds.filter(
    (billId) => !loadedBillIds.has(billId),
  );

  useEffect(() => {
    if (
      unresolvedSelectedBillIds.length === 0 ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError
    ) {
      return;
    }

    // A reopened allocation can contain ids from later pages. Load forward
    // until those confirmed selections are visible or pagination is exhausted.
    void fetchNextPage();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    unresolvedSelectedBillIds.length,
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
  const unallocatedAmount = calculateReceiptRemainingAmount(
    receiptAmount,
    allocations,
  );
  const hasMore = Boolean(outstandingQuery.hasNextPage);
  const allEligibleBillsLoaded =
    outstandingQuery.isSuccess &&
    !hasMore &&
    !outstandingQuery.isFetchingNextPage;
  const advancePreview =
    unallocatedAmount === 0
      ? 0
      : calculateReceiptAdvancePreview(
          receiptAmount,
          allocations,
          allEligibleBillsLoaded,
        );
  const allocationPercent = Math.min(
    receiptAmount > 0 ? (totalSettled / receiptAmount) * 100 : 0,
    100,
  );
  const outstandingDisplay = getReceiptOutstandingDisplay(
    receiptDraft.selectedParty?.totalReceivable,
    partyBalanceQuery.data?.totalOutstanding,
  );

  const latestAllocationsRef = useRef(allocations);
  const canCommitProgressRef = useRef(false);
  latestAllocationsRef.current = allocations;
  canCommitProgressRef.current =
    isContextValid &&
    outstandingQuery.isSuccess &&
    !isDraftLocked &&
    (!hasMore || unresolvedSelectedBillIds.length === 0);

  const commitProgressOnExit = useCallback(() => {
    if (skipBackCommitRef.current || !canCommitProgressRef.current) return;

    const latestAllocations = latestAllocationsRef.current;
    const allocationChanged =
      getAllocationSignature(latestAllocations) !== originalSignatureRef.current;

    if (selectionTouchedRef.current || allocationChanged) {
      // Back saves the exact rows currently displayed, but does not mark the
      // allocation confirmed. Reopening therefore restores manual exclusions.
      dispatch(setReceiptAllocationProgress(latestAllocations));
    }
  }, [dispatch]);

  useEffect(
    () => navigation.addListener("beforeRemove", commitProgressOnExit),
    [commitProgressOnExit, navigation],
  );

  const handleToggleBill = (billId: string) => {
    if (isDraftLocked) return;

    const isSelected = selectedBillIds.includes(billId);
    if (!isSelected && unallocatedAmount <= 0) return;

    manualSelectionRef.current = true;
    selectionTouchedRef.current = true;
    setSelectedBillIds((currentIds) =>
      isSelected
        ? currentIds.filter((id) => id !== billId)
        : [...currentIds, billId],
    );
  };

  const handleLoadMore = () => {
    if (
      !outstandingQuery.hasNextPage ||
      outstandingQuery.isFetchingNextPage
    ) {
      return;
    }

    void outstandingQuery.fetchNextPage();
  };

  const handleConfirm = () => {
    if (!isContextValid) {
      toast.error("Receipt details changed. Return and review the main form");
      return;
    }

    const validationError = getReceiptConfirmationValidationError({
      receiptAmount,
      allocations,
      loadedBills: eligibleBills,
      hasMore,
      isLoading:
        outstandingQuery.isFetching || outstandingQuery.isFetchingNextPage,
      hasError:
        outstandingQuery.isError || outstandingQuery.isFetchNextPageError,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    skipBackCommitRef.current = true;
    dispatch(setReceiptAllocations(allocations));
    router.back();
  };

  if (!isContextValid) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Receipt Allocation" />
        <PageError
          title="Receipt details are incomplete"
          description="Return to the Receipt form and select a company and customer."
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  if (isDraftLocked) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Receipt Allocation" />
        <PageError
          title="Receipt allocation is locked"
          description="This Receipt may already have been submitted and cannot be changed."
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  if (outstandingQuery.isError && !outstandingQuery.data) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Receipt Allocation" />
        <PageError
          title="Could not load Outstanding bills"
          description="Check your connection and retry before allocating this Receipt."
          onRetry={() => void outstandingQuery.refetch()}
        />
      </View>
    );
  }

  const confirmBlocked =
    receiptAmount <= 0 ||
    outstandingQuery.isFetching ||
    outstandingQuery.isFetchingNextPage ||
    outstandingQuery.isFetchNextPageError ||
    (hasMore && unresolvedSelectedBillIds.length > 0) ||
    (unallocatedAmount > 0 && hasMore);

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Receipt Allocation"
        onBack={() => router.back()}
      />

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
                  Customer
                </Text>
                <Text className="mt-0.5 text-[15px] font-extrabold text-white">
                  {receiptDraft.selectedParty?.partyName || "Customer"}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-end justify-between">
              <View className="flex-1">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                  Total outstanding
                </Text>
                {partyBalanceQuery.isLoading ? (
                  <View className="mt-1 flex-row items-center">
                    <ActivityIndicator color="#bfdbfe" size="small" />
                    <Text className="ml-2 text-[12px] text-blue-100">
                      Checking balance...
                    </Text>
                  </View>
                ) : outstandingDisplay ? (
                  <Text className="mt-1 text-[18px] font-extrabold text-white">
                    {formatMoney(outstandingDisplay.grossReceivable)} DR
                  </Text>
                ) : (
                  <Text className="mt-1 text-[12px] font-semibold text-blue-100">
                    Unavailable
                  </Text>
                )}
              </View>
              <Text className="text-[11px] font-bold text-white">
                {Math.round(allocationPercent)}% allocated
              </Text>
            </View>

            {/* {outstandingDisplay && outstandingDisplay.netOutstanding !== null ? (
              <Text className="mt-1 text-[11px] text-blue-100">
                Net after customer credits: {formatNetOutstanding(outstandingDisplay.netOutstanding)}
              </Text>
            ) : !partyBalanceQuery.isLoading ? (
              <Text className="mt-1 text-[11px] text-blue-100">
                Net after customer credits: Unavailable
              </Text>
            ) : null} */}

            <View className="mt-3">
              <View className="h-2 overflow-hidden rounded-full bg-white/20">
                <View
                  className="h-2 rounded-full bg-emerald-300"
                  style={{ width: `${allocationPercent}%` }}
                />
              </View>
              <Text className="mt-1.5 text-[10px] text-blue-100">
                {formatMoney(totalSettled)} of {formatMoney(receiptAmount)} allocated
              </Text>
            </View>
          </View>

          <View className="mt-3">
            <ReceiptAmountSection
              value={receiptDraft.receiptAmount}
              onChangeText={(value) => dispatch(setReceiptAmount(value))}
            />
          </View>

          <View className="mb-2 mt-4">
            <Text className="text-[15px] font-extrabold text-slate-900">
              Outstanding bills
            </Text>
            <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
              Oldest bills are allocated first. Tap a bill to include or exclude it.
            </Text>
          </View>
        </View>

        <FlatList
          className="flex-1 px-4"
          data={allocatedBills}
          keyExtractor={(item) => item.bill._id}
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ReceiptOutstandingBillCard
              item={item}
              disabled={!item.selected && unallocatedAmount <= 0}
              onToggle={handleToggleBill}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
          outstandingQuery.isLoading ? (
            <View className="items-center rounded-3xl border border-slate-200 bg-white px-6 py-9">
              <ActivityIndicator color="#134074" />
              <Text className="mt-3 text-[12px] text-slate-500">
                Loading Outstanding bills...
              </Text>
            </View>
          ) : (
            <View className="items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-9">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                <ReceiptText color="#047857" size={22} strokeWidth={2.2} />
              </View>
              <Text className="mt-3 text-[14px] font-extrabold text-slate-900">
                No eligible Outstanding bills
              </Text>
              <Text className="mt-1 text-center text-[12px] leading-5 text-slate-500">
                The full Receipt amount is an advance preview once all pages are confirmed loaded.
              </Text>
            </View>
          )
          }
          ListFooterComponent={
          <View className="pt-1">
            {outstandingQuery.isFetchNextPageError ? (
              <View className="mb-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <Text className="text-[12px] leading-5 text-rose-700">
                  The next page could not be loaded. Retry before confirming an advance.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleLoadMore}
                  className="mt-2 self-start"
                >
                  <Text className="text-[12px] font-extrabold text-rose-700">
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : hasMore ? (
              <Pressable
                accessibilityRole="button"
                disabled={outstandingQuery.isFetchingNextPage}
                onPress={handleLoadMore}
                className="mb-2 min-h-12 flex-row items-center justify-center rounded-2xl border border-[#134074] bg-white px-4"
              >
                {outstandingQuery.isFetchingNextPage ? (
                  <ActivityIndicator color="#134074" />
                ) : (
                  <Text className="text-[13px] font-extrabold text-[#134074]">
                    Load more bills
                  </Text>
                )}
              </Pressable>
            ) : null}

          </View>
          }
        />

      <View
        className="border-t border-slate-200 bg-white px-4 pt-2.5"
        style={{ paddingBottom: Math.max(insets.bottom, 10) }}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-[11px] font-semibold text-slate-600">
            Allocated {formatMoney(totalSettled)}
          </Text>
          <Text className="text-[11px] font-semibold text-slate-600">
            {advancePreview === null
              ? "Advance: Load remaining bills"
              : `Advance ${formatMoney(advancePreview)}`}
          </Text>
        </View>
        {receiptAmount <= 0 ? (
          <Text className="mb-2 text-center text-[11px] text-amber-700">
            Enter a Receipt amount before confirming allocation.
          </Text>
        ) : null}
        {unallocatedAmount > 0 && hasMore ? (
          <Text className="mb-2 text-center text-[11px] text-amber-700">
            Review remaining bills before confirming an advance.
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: confirmBlocked }}
          disabled={confirmBlocked}
          onPress={handleConfirm}
          className={`min-h-14 flex-row items-center justify-center rounded-2xl bg-[#134074] px-5 ${
            confirmBlocked ? "opacity-45" : ""
          }`}
        >
          <Text className="text-[15px] font-extrabold text-white">
            Confirm Allocation
          </Text>
          <View className="ml-2">
            <ArrowRight color="#ffffff" size={19} strokeWidth={2.4} />
          </View>
        </Pressable>
        <Text className="mt-2 text-center text-[10px] text-slate-500">
          Payment details and final confirmation come next.
        </Text>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}
