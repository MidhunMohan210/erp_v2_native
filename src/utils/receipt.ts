import type { OutstandingBill } from "../types/outstanding";
import type { Party } from "../types/party";
import type {
  CreateReceiptRequest,
  ReceiptAllocatedBill,
  ReceiptAllocation,
  ReceiptCashBankType,
  ReceiptInstrumentType,
  ReceiptSettlementRequestRow,
} from "../types/receipt";
import type { VoucherSeriesItem } from "../types/voucher";

const MONEY_DECIMAL_PLACES = 2;
const MONEY_MULTIPLIER = 10 ** MONEY_DECIMAL_PLACES;

export type ReceiptOutstandingDisplay = {
  grossReceivable: number;
  netOutstanding: number | null;
};

function getOptionalMoney(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(Number(value))) return null;

  return roundReceiptMoney(Number(value));
}

export function getReceiptOutstandingDisplay(
  grossReceivableValue: number | undefined,
  netOutstandingValue: number | undefined,
): ReceiptOutstandingDisplay | null {
  const grossReceivable = getOptionalMoney(grossReceivableValue);
  if (grossReceivable === null) return null;

  return {
    // Gross receivable is the debit-bill total. It must come from Party data,
    // not the currently loaded page of Outstanding bills.
    grossReceivable: Math.max(grossReceivable, 0),
    netOutstanding: getOptionalMoney(netOutstandingValue),
  };
}

export function roundReceiptMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.round((value + Number.EPSILON) * MONEY_MULTIPLIER) /
    MONEY_MULTIPLIER;
}

function getPositivePendingAmount(bill: OutstandingBill): number {
  return Math.max(roundReceiptMoney(Number(bill.bill_pending_amt) || 0), 0);
}

export function allocateReceiptOldestFirst(
  receiptAmount: number,
  bills: OutstandingBill[],
): ReceiptAllocatedBill[] {
  let remaining = Math.max(roundReceiptMoney(receiptAmount), 0);

  return bills.map((bill) => {
    const pendingAmount = getPositivePendingAmount(bill);
    const settledAmount = Math.min(pendingAmount, remaining);
    remaining = roundReceiptMoney(remaining - settledAmount);

    return {
      bill,
      selected: settledAmount > 0,
      settledAmount,
      remainingAmount: roundReceiptMoney(pendingAmount - settledAmount),
    };
  });
}

export function redistributeSelectedReceiptBills(
  receiptAmount: number,
  bills: ReceiptAllocatedBill[],
): ReceiptAllocatedBill[] {
  let remaining = Math.max(roundReceiptMoney(receiptAmount), 0);

  return bills.map((item) => {
    const pendingAmount = getPositivePendingAmount(item.bill);
    const settledAmount = item.selected
      ? Math.min(pendingAmount, remaining)
      : 0;
    remaining = roundReceiptMoney(remaining - settledAmount);

    return {
      ...item,
      selected: item.selected && settledAmount > 0,
      settledAmount,
      remainingAmount: roundReceiptMoney(pendingAmount - settledAmount),
    };
  });
}

export function calculateReceiptTotalSettled(
  allocations: ReceiptAllocation[],
): number {
  return roundReceiptMoney(
    allocations.reduce(
      (total, allocation) => total + Number(allocation.settledAmount || 0),
      0,
    ),
  );
}

export function calculateReceiptRemainingAmount(
  receiptAmount: number,
  allocations: ReceiptAllocation[],
): number {
  return Math.max(
    roundReceiptMoney(
      Number(receiptAmount || 0) - calculateReceiptTotalSettled(allocations),
    ),
    0,
  );
}

export function calculateReceiptAdvancePreview(
  receiptAmount: number,
  allocations: ReceiptAllocation[],
  allEligibleBillsLoaded: boolean,
): number | null {
  // More Outstanding pages may consume the remaining amount, so it is not yet
  // safe to label that value as an advance until every eligible bill is known.
  if (!allEligibleBillsLoaded) return null;

  return calculateReceiptRemainingAmount(receiptAmount, allocations);
}

export function getReceiptAllocationValidationError(
  receiptAmount: number,
  allocations: ReceiptAllocation[],
): string | null {
  const normalizedReceiptAmount = roundReceiptMoney(receiptAmount);
  const seenOutstandingIds = new Set<string>();

  if (normalizedReceiptAmount <= 0) {
    return "Receipt amount must be greater than zero";
  }

  for (const allocation of allocations) {
    if (!allocation.outstandingId) {
      return "Every settlement must reference an Outstanding bill";
    }
    if (seenOutstandingIds.has(allocation.outstandingId)) {
      return "The same Outstanding bill cannot be settled more than once";
    }
    if (roundReceiptMoney(allocation.settledAmount) <= 0) {
      return "Settled amount must be greater than zero";
    }

    seenOutstandingIds.add(allocation.outstandingId);
  }

  if (calculateReceiptTotalSettled(allocations) > normalizedReceiptAmount) {
    return "Total settled amount cannot exceed receipt amount";
  }

  return null;
}

export type ReceiptConfirmationValidationInput = {
  receiptAmount: number;
  allocations: ReceiptAllocation[];
  loadedBills: OutstandingBill[];
  hasMore: boolean;
  isLoading: boolean;
  hasError: boolean;
};

export function getReceiptConfirmationValidationError({
  receiptAmount,
  allocations,
  loadedBills,
  hasMore,
  isLoading,
  hasError,
}: ReceiptConfirmationValidationInput): string | null {
  if (isLoading) return "Wait for Outstanding bills to finish loading";
  if (hasError) return "Resolve the Outstanding loading error before confirming";

  const allocationError = getReceiptAllocationValidationError(
    receiptAmount,
    allocations,
  );
  if (allocationError) return allocationError;

  const pendingAmountById = new Map(
    loadedBills.map((bill) => [
      bill._id,
      Math.max(roundReceiptMoney(Number(bill.bill_pending_amt) || 0), 0),
    ]),
  );

  for (const allocation of allocations) {
    const pendingAmount = pendingAmountById.get(allocation.outstandingId);
    if (pendingAmount === undefined) {
      return "A selected Outstanding bill is no longer available";
    }
    if (roundReceiptMoney(allocation.settledAmount) > pendingAmount) {
      return "A settlement cannot exceed its current Outstanding balance";
    }
  }

  const unallocatedAmount = calculateReceiptRemainingAmount(
    receiptAmount,
    allocations,
  );
  if (unallocatedAmount > 0 && hasMore) {
    return "Load all remaining Outstanding bills before confirming an advance";
  }

  return null;
}

export function buildReceiptSettlementRows(
  allocations: ReceiptAllocation[],
): ReceiptSettlementRequestRow[] {
  return allocations
    .filter(
      (allocation) =>
        Boolean(allocation.outstandingId) &&
        roundReceiptMoney(allocation.settledAmount) > 0,
    )
    .map((allocation) => ({
      outstanding: allocation.outstandingId,
      settled_amount: roundReceiptMoney(allocation.settledAmount),
    }));
}

export function getRequiredReceiptAccountType(
  instrumentType: ReceiptInstrumentType,
): ReceiptCashBankType {
  return instrumentType === "cash" ? "cash" : "bank";
}

export function getReceiptAccountValidationError(
  instrumentType: ReceiptInstrumentType,
  cashBankType: string | null | undefined,
): string | null {
  const requiredType = getRequiredReceiptAccountType(instrumentType);

  if (!cashBankType) {
    return requiredType === "cash"
      ? "Select a cash account"
      : "Select a bank account";
  }

  if (cashBankType !== requiredType) {
    return instrumentType === "cash"
      ? "Cash receipts require a cash account"
      : "Bank instruments require a bank account";
  }

  return null;
}

export type ReceiptMainFormValidationInput = {
  companyId: string;
  transactionDate: string;
  hasSelectedSeries: boolean;
  selectedPartyType: string | null | undefined;
  receiptAmount: string;
  instrumentType: ReceiptInstrumentType;
  selectedCashBankType: string | null | undefined;
  chequeNumber: string;
  chequeDate: string | null;
  isSubmissionLocked: boolean;
};

export function isValidReceiptDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function getNextReceiptAmountInput(
  currentValue: string,
  nextValue: string,
): string {
  const normalizedValue = nextValue.replace(",", ".");

  if (normalizedValue === ".") return "0.";
  if (/^\d*(\.\d{0,2})?$/.test(normalizedValue)) return normalizedValue;

  return currentValue;
}

export function getReceiptMainFormValidationError({
  companyId,
  transactionDate,
  hasSelectedSeries,
  selectedPartyType,
  receiptAmount,
  instrumentType,
  selectedCashBankType,
  chequeNumber,
  chequeDate,
  isSubmissionLocked,
}: ReceiptMainFormValidationInput): string | null {
  if (isSubmissionLocked) {
    return "This Receipt has an unfinished submission and cannot be changed";
  }
  if (!companyId) return "Select a company first";
  if (!isValidReceiptDate(transactionDate)) {
    return "Select a valid transaction date";
  }
  if (!hasSelectedSeries) return "Select a Receipt voucher series";
  if (selectedPartyType !== "party") return "Select a customer";

  const amount = Number(receiptAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Receipt amount must be greater than zero";
  }

  const accountError = getReceiptAccountValidationError(
    instrumentType,
    selectedCashBankType,
  );
  if (accountError) return accountError;

  if (instrumentType === "cheque") {
    if (!chequeNumber.trim()) return "Enter the cheque number";
    if (!chequeDate || !isValidReceiptDate(chequeDate)) {
      return "Select a valid cheque date";
    }
  }

  return null;
}

export type ReceiptReviewDraftInput = {
  companyId: string;
  draftCompanyId: string;
  requestId: string;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem | null;
  selectedParty: Party | null;
  receiptAmount: string;
  selectedCashBank: Party | null;
  instrumentType: ReceiptInstrumentType;
  allocations: ReceiptAllocation[];
  allocationStatus: "not_started" | "in_progress" | "confirmed";
  narration: string;
  chequeNumber: string;
  chequeDate: string | null;
};

export function getReceiptReviewValidationError(
  input: ReceiptReviewDraftInput,
): string | null {
  if (!input.companyId || input.draftCompanyId !== input.companyId) {
    return "This Receipt does not belong to the selected company";
  }
  if (!input.requestId.trim()) return "Receipt request ID is missing";
  if (!input.selectedSeries?._id) return "Select a Receipt voucher series";
  if (!input.selectedParty?.partyName?.trim()) {
    return "The selected customer name is missing";
  }
  if (!input.selectedCashBank?.partyName?.trim()) {
    return "The selected Cash/Bank account name is missing";
  }

  const formError = getReceiptMainFormValidationError({
    companyId: input.companyId,
    transactionDate: input.transactionDate,
    hasSelectedSeries: Boolean(input.selectedSeries),
    selectedPartyType: input.selectedParty?.partyType,
    receiptAmount: input.receiptAmount,
    instrumentType: input.instrumentType,
    selectedCashBankType: input.selectedCashBank?.partyType,
    chequeNumber: input.chequeNumber,
    chequeDate: input.chequeDate,
    isSubmissionLocked: false,
  });
  if (formError) return formError;

  if (input.allocationStatus !== "confirmed") {
    return "Confirm the Outstanding allocation before reviewing this Receipt";
  }

  const allocationError = getReceiptAllocationValidationError(
    Number(input.receiptAmount),
    input.allocations,
  );
  if (allocationError) return allocationError;

  for (const allocation of input.allocations) {
    if (allocation.confirmedPendingAmount === undefined) {
      return "Return to allocation and reconfirm the selected bills";
    }
  }

  return null;
}

export function getStaleReceiptAllocationError(
  allocations: ReceiptAllocation[],
  currentBills: OutstandingBill[],
): string | null {
  const currentPendingById = new Map(
    currentBills.map((bill) => [
      bill._id,
      roundReceiptMoney(Number(bill.bill_pending_amt) || 0),
    ]),
  );

  for (const allocation of allocations) {
    const currentPending = currentPendingById.get(allocation.outstandingId);
    if (currentPending === undefined) {
      return "A selected Outstanding bill is no longer available. Reallocate the Receipt.";
    }
    if (
      allocation.confirmedPendingAmount === undefined ||
      currentPending !== roundReceiptMoney(allocation.confirmedPendingAmount)
    ) {
      return "An Outstanding balance changed after confirmation. Review the allocation again.";
    }
    if (roundReceiptMoney(allocation.settledAmount) > currentPending) {
      return "A settlement now exceeds its current Outstanding balance. Reallocate the Receipt.";
    }
  }

  return null;
}

export function buildReceiptCreatePayload(
  input: ReceiptReviewDraftInput,
): CreateReceiptRequest {
  const validationError = getReceiptReviewValidationError(input);
  if (validationError) throw new Error(validationError);

  const series = input.selectedSeries;
  const party = input.selectedParty;
  const account = input.selectedCashBank;
  if (!series || !party || !account) {
    throw new Error("Receipt details are incomplete");
  }

  const accountType = getRequiredReceiptAccountType(input.instrumentType);
  return {
    cmp_id: input.companyId,
    request_id: input.requestId,
    voucher_type: "receipt",
    series_id: series._id,
    date: input.transactionDate,
    party_id: party._id,
    party_name: party.partyName?.trim() || "",
    cash_bank_id: account._id,
    cash_bank_name: account.partyName?.trim() || "",
    cash_bank_type: accountType,
    instrument_type: input.instrumentType,
    amount: roundReceiptMoney(Number(input.receiptAmount)),
    settlement_details: buildReceiptSettlementRows(input.allocations),
    narration: input.narration.trim() || null,
    cheque_number:
      input.instrumentType === "cheque"
        ? input.chequeNumber.trim() || null
        : null,
    cheque_date:
      input.instrumentType === "cheque" ? input.chequeDate : null,
  };
}
