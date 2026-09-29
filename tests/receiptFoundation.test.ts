import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import receiptDraftReducer, {
  clearReceiptDraft,
  initializeReceiptDraft,
  restoreReceiptSubmission,
  setReceiptAllocationProgress,
  setReceiptAllocations,
  setReceiptAmount,
  setReceiptCashBank,
  setReceiptChequeDetails,
  setReceiptDate,
  setReceiptInstrument,
  setReceiptNarration,
  setReceiptParty,
  setReceiptSeries,
  setReceiptSubmittedPayload,
} from "../src/store/receiptDraftSlice";
import type { Party } from "../src/types/party";
import type { CreateReceiptRequest } from "../src/types/receipt";
import type { OutstandingBill } from "../src/types/outstanding";
import {
  allocateReceiptOldestFirst,
  buildReceiptCreatePayload,
  buildReceiptSettlementRows,
  calculateReceiptAdvancePreview,
  calculateReceiptRemainingAmount,
  calculateReceiptTotalSettled,
  getNextReceiptAmountInput,
  getReceiptAccountValidationError,
  getReceiptAllocationValidationError,
  getReceiptConfirmationValidationError,
  getReceiptMainFormValidationError,
  getReceiptOutstandingDisplay,
  getReceiptReviewValidationError,
  getStaleReceiptAllocationError,
  redistributeSelectedReceiptBills,
} from "../src/utils/receipt";
import {
  areReceiptRecoveryPayloadsEqual,
  getReceiptRecoveryStorageKey,
  parseReceiptSubmissionRecovery,
} from "../src/utils/receiptRecovery";

function createBill(id: string, pendingAmount: number): OutstandingBill {
  return {
    _id: id,
    bill_pending_amt: pendingAmount,
    classification: "dr",
  };
}

function createParty(id: string, partyType: "party" | "cash" | "bank"): Party {
  return {
    _id: id,
    partyName: id,
    partyType,
  };
}

function createPayload(requestId: string): CreateReceiptRequest {
  return {
    cmp_id: "company-a",
    request_id: requestId,
    voucher_type: "receipt",
    series_id: "series-a",
    date: "2026-09-28",
    party_id: "party-a",
    party_name: "Party A",
    cash_bank_id: "cash-a",
    cash_bank_name: "Cash A",
    cash_bank_type: "cash",
    instrument_type: "cash",
    amount: 1000,
    settlement_details: [],
    narration: null,
    cheque_number: null,
    cheque_date: null,
  };
}

test("allocates 1000 across 700 and 600 as 700 and 300", () => {
  const result = allocateReceiptOldestFirst(1000, [
    createBill("bill-a", 700),
    createBill("bill-b", 600),
  ]);

  assert.deepEqual(
    result.map((item) => ({
      settled: item.settledAmount,
      remaining: item.remainingAmount,
    })),
    [
      { settled: 700, remaining: 0 },
      { settled: 300, remaining: 300 },
    ],
  );
});

test("allocates a 300 Receipt partially against one 1000 bill", () => {
  const result = allocateReceiptOldestFirst(300, [createBill("bill-a", 1000)]);

  assert.equal(result[0].settledAmount, 300);
  assert.equal(result[0].remainingAmount, 700);
});

test("changing Receipt amount reapplies oldest-first allocation", () => {
  const bills = [createBill("bill-18", 118), createBill("bill-19", 236)];
  const firstAmount = allocateReceiptOldestFirst(100, bills);
  const changedAmount = allocateReceiptOldestFirst(150, bills);

  assert.deepEqual(
    firstAmount.map((item) => item.settledAmount),
    [100, 0],
  );
  assert.deepEqual(
    changedAmount.map((item) => item.settledAmount),
    [118, 32],
  );
});

test("calculates 200 advance only after all eligible bills are loaded", () => {
  const bills = allocateReceiptOldestFirst(1200, [
    createBill("bill-a", 700),
    createBill("bill-b", 300),
  ]);
  const allocations = bills.map((item) => ({
    outstandingId: item.bill._id,
    settledAmount: item.settledAmount,
  }));

  assert.equal(calculateReceiptTotalSettled(allocations), 1000);
  assert.equal(calculateReceiptAdvancePreview(1200, allocations, false), null);
  assert.equal(calculateReceiptAdvancePreview(1200, allocations, true), 200);
  assert.deepEqual(buildReceiptSettlementRows(allocations), [
    { outstanding: "bill-a", settled_amount: 700 },
    { outstanding: "bill-b", settled_amount: 300 },
  ]);
});

test("calculates exact and full advance allocation outcomes", () => {
  const exactBills = allocateReceiptOldestFirst(1000, [
    createBill("bill-a", 400),
    createBill("bill-b", 600),
  ]);
  const exactAllocations = exactBills.map((item) => ({
    outstandingId: item.bill._id,
    settledAmount: item.settledAmount,
  }));

  assert.equal(calculateReceiptTotalSettled(exactAllocations), 1000);
  assert.equal(calculateReceiptRemainingAmount(1000, exactAllocations), 0);
  assert.equal(calculateReceiptAdvancePreview(1000, [], true), 1000);
});

test("unchecking a bill redistributes only among remaining selections", () => {
  const automaticBills = allocateReceiptOldestFirst(1000, [
    createBill("bill-a", 700),
    createBill("bill-b", 600),
  ]);
  const redistributed = redistributeSelectedReceiptBills(
    1000,
    automaticBills.map((item) => ({
      ...item,
      selected: item.bill._id !== "bill-a",
    })),
  );

  assert.equal(redistributed[0].settledAmount, 0);
  assert.equal(redistributed[1].settledAmount, 600);
  assert.equal(
    calculateReceiptRemainingAmount(1000, [
      { outstandingId: "bill-b", settledAmount: 600 },
    ]),
    400,
  );

  const allUnchecked = redistributeSelectedReceiptBills(
    1000,
    automaticBills.map((item) => ({ ...item, selected: false })),
  );
  assert.deepEqual(
    allUnchecked.map((item) => item.settledAmount),
    [0, 0],
  );
});

test("party and amount changes clear stale allocations", () => {
  let state = receiptDraftReducer(
    undefined,
    initializeReceiptDraft({
      companyId: "company-a",
      requestId: "request-a",
      transactionDate: "2026-09-28",
    }),
  );
  state = receiptDraftReducer(
    state,
    setReceiptParty(createParty("party-a", "party")),
  );
  state = receiptDraftReducer(
    state,
    setReceiptAllocations([{ outstandingId: "bill-a", settledAmount: 100 }]),
  );
  state = receiptDraftReducer(
    state,
    setReceiptParty(createParty("party-b", "party")),
  );
  assert.deepEqual(state.allocations, []);
  assert.equal(state.allocationStatus, "not_started");

  state = receiptDraftReducer(
    state,
    setReceiptAllocations([{ outstandingId: "bill-b", settledAmount: 50 }]),
  );
  state = receiptDraftReducer(state, setReceiptAmount("500"));
  assert.deepEqual(state.allocations, []);
  assert.equal(state.allocationStatus, "not_started");
});

test("company changes create a clean company-scoped draft", () => {
  let state = receiptDraftReducer(
    undefined,
    initializeReceiptDraft({
      companyId: "company-a",
      requestId: "request-a",
      transactionDate: "2026-09-28",
    }),
  );
  state = receiptDraftReducer(state, setReceiptAmount("400"));
  state = receiptDraftReducer(
    state,
    initializeReceiptDraft({
      companyId: "company-b",
      requestId: "request-b",
      transactionDate: "2026-09-29",
    }),
  );

  assert.equal(state.companyId, "company-b");
  assert.equal(state.requestId, "request-b");
  assert.equal(state.receiptAmount, "");
  assert.equal(state.selectedParty, null);
  assert.deepEqual(state.allocations, []);
});

test("instrument changes clear only incompatible data", () => {
  let state = receiptDraftReducer(
    undefined,
    initializeReceiptDraft({
      companyId: "company-a",
      requestId: "request-a",
      transactionDate: "2026-09-28",
    }),
  );

  state = receiptDraftReducer(state, setReceiptCashBank(createParty("cash", "cash")));
  state = receiptDraftReducer(state, setReceiptInstrument("upi"));
  assert.equal(state.selectedCashBank, null);

  state = receiptDraftReducer(state, setReceiptCashBank(createParty("bank", "bank")));
  state = receiptDraftReducer(state, setReceiptInstrument("cash"));
  assert.equal(state.selectedCashBank, null);

  state = receiptDraftReducer(state, setReceiptInstrument("cheque"));
  state = receiptDraftReducer(state, setReceiptCashBank(createParty("bank", "bank")));
  state = receiptDraftReducer(
    state,
    setReceiptChequeDetails({
      chequeNumber: "CHQ-1",
      chequeDate: "2026-09-28",
    }),
  );
  state = receiptDraftReducer(state, setReceiptInstrument("upi"));
  assert.equal(state.selectedCashBank?._id, "bank");
  assert.equal(state.chequeNumber, "");
  assert.equal(state.chequeDate, null);

  assert.equal(getReceiptAccountValidationError("cash", "bank"), "Cash receipts require a cash account");
});

test("same logical draft retains request id and submitted payload", () => {
  let state = receiptDraftReducer(
    undefined,
    initializeReceiptDraft({
      companyId: "company-a",
      requestId: "request-a",
      transactionDate: "2026-09-28",
    }),
  );
  state = receiptDraftReducer(
    state,
    initializeReceiptDraft({
      companyId: "company-a",
      requestId: "replacement-must-not-win",
      transactionDate: "2026-09-29",
    }),
  );
  assert.equal(state.requestId, "request-a");

  const payload = createPayload("request-a");
  state = receiptDraftReducer(state, setReceiptSubmittedPayload(payload));
  state = receiptDraftReducer(state, setReceiptAmount("999"));
  state = receiptDraftReducer(
    state,
    setReceiptAllocationProgress([
      { outstandingId: "bill-a", settledAmount: 100 },
    ]),
  );
  assert.strictEqual(state.submittedPayload, payload);
  assert.equal(state.receiptAmount, "");
  assert.deepEqual(state.allocations, []);

  state = receiptDraftReducer(state, clearReceiptDraft());
  state = receiptDraftReducer(
    state,
    initializeReceiptDraft({
      companyId: "company-a",
      requestId: "request-b",
      transactionDate: "2026-09-28",
    }),
  );
  assert.equal(state.requestId, "request-b");
  assert.equal(state.submittedPayload, null);
});

test("allocation progress and confirmation reopen with the same minimal rows", () => {
  let state = receiptDraftReducer(
    undefined,
    initializeReceiptDraft({
      companyId: "company-a",
      requestId: "request-a",
      transactionDate: "2026-09-28",
    }),
  );
  const allocations = [
    { outstandingId: "bill-a", settledAmount: 700 },
    { outstandingId: "bill-b", settledAmount: 300 },
  ];

  state = receiptDraftReducer(
    state,
    setReceiptAllocationProgress(allocations),
  );
  assert.equal(state.allocationStatus, "in_progress");
  assert.deepEqual(state.allocations, allocations);
  assert.equal(state.requestId, "request-a");

  state = receiptDraftReducer(state, setReceiptAllocations(allocations));
  assert.equal(state.allocationStatus, "confirmed");
  assert.deepEqual(state.allocations, allocations);
  assert.equal(state.requestId, "request-a");
});

test("allocation confirmation blocks pagination, loading, and stale balances", () => {
  const bills = [createBill("bill-a", 700), createBill("bill-b", 600)];

  assert.equal(
    getReceiptConfirmationValidationError({
      receiptAmount: 1000,
      allocations: [{ outstandingId: "bill-a", settledAmount: 700 }],
      loadedBills: bills,
      hasMore: true,
      isLoading: false,
      hasError: false,
    }),
    "Load all remaining Outstanding bills before confirming an advance",
  );
  assert.equal(
    getReceiptConfirmationValidationError({
      receiptAmount: 1000,
      allocations: [],
      loadedBills: bills,
      hasMore: false,
      isLoading: true,
      hasError: false,
    }),
    "Wait for Outstanding bills to finish loading",
  );
  assert.equal(
    getReceiptConfirmationValidationError({
      receiptAmount: 1000,
      allocations: [],
      loadedBills: bills,
      hasMore: false,
      isLoading: false,
      hasError: true,
    }),
    "Resolve the Outstanding loading error before confirming",
  );
  assert.equal(
    getReceiptConfirmationValidationError({
      receiptAmount: 1000,
      allocations: [{ outstandingId: "bill-a", settledAmount: 701 }],
      loadedBills: bills,
      hasMore: false,
      isLoading: false,
      hasError: false,
    }),
    "A settlement cannot exceed its current Outstanding balance",
  );
});

test("allocation validation rejects duplicates and totals above the Receipt", () => {
  assert.equal(
    getReceiptAllocationValidationError(1000, [
      { outstandingId: "bill-a", settledAmount: 400 },
      { outstandingId: "bill-a", settledAmount: 300 },
    ]),
    "The same Outstanding bill cannot be settled more than once",
  );
  assert.equal(
    getReceiptAllocationValidationError(1000, [
      { outstandingId: "bill-a", settledAmount: 1000.01 },
    ]),
    "Total settled amount cannot exceed receipt amount",
  );
});

test("main form fields update the Receipt draft", () => {
  let state = receiptDraftReducer(
    undefined,
    initializeReceiptDraft({
      companyId: "company-a",
      requestId: "request-a",
      transactionDate: "2026-09-28",
    }),
  );
  const series = { _id: "series-a", seriesName: "Receipt" };

  state = receiptDraftReducer(state, setReceiptDate("2026-09-29"));
  state = receiptDraftReducer(state, setReceiptSeries(series));
  state = receiptDraftReducer(
    state,
    setReceiptParty(createParty("party-a", "party")),
  );
  state = receiptDraftReducer(state, setReceiptNarration("Bank collection"));

  assert.equal(state.transactionDate, "2026-09-29");
  assert.strictEqual(state.selectedSeries, series);
  assert.equal(state.selectedParty?._id, "party-a");
  assert.equal(state.narration, "Bank collection");
});

test("amount input accepts two decimals and rejects invalid edits", () => {
  assert.equal(getNextReceiptAmountInput("", "1000"), "1000");
  assert.equal(getNextReceiptAmountInput("1000", "1000.25"), "1000.25");
  assert.equal(getNextReceiptAmountInput("1000.25", "1000.256"), "1000.25");
  assert.equal(getNextReceiptAmountInput("1000", "-1000"), "1000");
  assert.equal(getNextReceiptAmountInput("", "."), "0.");
});

test("receipt outstanding header keeps gross debit and net credit values separate", () => {
  assert.deepEqual(getReceiptOutstandingDisplay(1250, -300), {
    grossReceivable: 1250,
    netOutstanding: -300,
  });
  assert.deepEqual(getReceiptOutstandingDisplay(0, 0), {
    grossReceivable: 0,
    netOutstanding: 0,
  });
  assert.equal(getReceiptOutstandingDisplay(undefined, 500), null);
});

test("main form validation blocks incomplete and incompatible Receipts", () => {
  const validCashForm = {
    companyId: "company-a",
    transactionDate: "2026-09-28",
    hasSelectedSeries: true,
    selectedPartyType: "party",
    receiptAmount: "1000.25",
    instrumentType: "cash" as const,
    selectedCashBankType: "cash",
    chequeNumber: "",
    chequeDate: null,
    isSubmissionLocked: false,
  };

  assert.equal(getReceiptMainFormValidationError(validCashForm), null);
  assert.equal(
    getReceiptMainFormValidationError({ ...validCashForm, companyId: "" }),
    "Select a company first",
  );
  assert.equal(
    getReceiptMainFormValidationError({
      ...validCashForm,
      transactionDate: "2026-02-30",
    }),
    "Select a valid transaction date",
  );
  assert.equal(
    getReceiptMainFormValidationError({
      ...validCashForm,
      hasSelectedSeries: false,
    }),
    "Select a Receipt voucher series",
  );
  assert.equal(
    getReceiptMainFormValidationError({
      ...validCashForm,
      selectedPartyType: "bank",
    }),
    "Select a customer",
  );
  assert.equal(
    getReceiptMainFormValidationError({
      ...validCashForm,
      receiptAmount: "0",
    }),
    "Receipt amount must be greater than zero",
  );
  assert.equal(
    getReceiptMainFormValidationError({
      ...validCashForm,
      instrumentType: "upi",
      selectedCashBankType: "cash",
    }),
    "Bank instruments require a bank account",
  );
  assert.equal(
    getReceiptMainFormValidationError({
      ...validCashForm,
      isSubmissionLocked: true,
    }),
    "This Receipt has an unfinished submission and cannot be changed",
  );
});

test("Cheque Receipts require a number and valid date", () => {
  const chequeForm = {
    companyId: "company-a",
    transactionDate: "2026-09-28",
    hasSelectedSeries: true,
    selectedPartyType: "party",
    receiptAmount: "500",
    instrumentType: "cheque" as const,
    selectedCashBankType: "bank",
    chequeNumber: "",
    chequeDate: null,
    isSubmissionLocked: false,
  };

  assert.equal(
    getReceiptMainFormValidationError(chequeForm),
    "Enter the cheque number",
  );
  assert.equal(
    getReceiptMainFormValidationError({
      ...chequeForm,
      chequeNumber: "CHQ-100",
    }),
    "Select a valid cheque date",
  );
  assert.equal(
    getReceiptMainFormValidationError({
      ...chequeForm,
      chequeNumber: "CHQ-100",
      chequeDate: "2026-09-28",
    }),
    null,
  );
});

test("Receipt service and Outstanding query use the finalized paths and scopes", () => {
  const root = process.cwd();
  const serviceSource = readFileSync(
    path.join(root, "src/services/cashTransaction.service.ts"),
    "utf8",
  );
  const querySource = readFileSync(
    path.join(root, "src/hooks/queries/outstandingQueries.ts"),
    "utf8",
  );

  assert.match(serviceSource, /"\/api\/cash-transactions"/);
  assert.match(serviceSource, /`\/api\/cash-transactions\/\$\{id\}`/);
  assert.match(serviceSource, /`\/api\/cash-transactions\/\$\{id\}\/cancel`/);
  assert.match(querySource, /scope: "general"/);
  assert.match(querySource, /scope: "receipt"/);
  assert.match(querySource, /classification: "dr"/);
  assert.match(querySource, /isCancelled: false/);
  assert.match(querySource, /positiveOnly: true/);
});

test("Receipt screens filter records and never submit during Phase 4D", () => {
  const root = process.cwd();
  const screenSource = readFileSync(
    path.join(root, "src/app/receipt-create.tsx"),
    "utf8",
  );
  const accountSource = readFileSync(
    path.join(
      root,
      "src/components/receipt-create/ReceiptCashBankSection.tsx",
    ),
    "utf8",
  );
  const allocationSource = readFileSync(
    path.join(root, "src/app/receipt-allocation.tsx"),
    "utf8",
  );

  assert.match(screenSource, /partyType="party"/);
  assert.match(accountSource, /partyType: requiredAccountType/);
  assert.match(allocationSource, /useReceiptOutstandingQuery/);
  assert.doesNotMatch(allocationSource, /fetchNextPage/);
  assert.doesNotMatch(allocationSource, /Load more bills/);
  assert.match(allocationSource, /beforeRemove/);
  assert.match(allocationSource, /outstandingQuery\.isLoading/);
  assert.match(allocationSource, /outstandingQuery\.isError/);
  assert.match(allocationSource, /outstandingQuery\.refetch/);
  assert.match(allocationSource, /No eligible Outstanding bills/);
  assert.doesNotMatch(screenSource, /createReceipt\s*\(/);
  assert.doesNotMatch(screenSource, /useCreateReceiptMutation/);
  assert.doesNotMatch(allocationSource, /createReceipt\s*\(/);
  assert.doesNotMatch(allocationSource, /useCreateReceiptMutation/);
});

function createReviewInput() {
  return {
    companyId: "company-a",
    draftCompanyId: "company-a",
    requestId: "request-a",
    transactionDate: "2026-09-28",
    selectedSeries: { _id: "series-a", seriesName: "Receipt" },
    selectedParty: createParty("party-a", "party"),
    receiptAmount: "1000",
    selectedCashBank: createParty("cash-a", "cash"),
    instrumentType: "cash" as const,
    allocations: [
      {
        outstandingId: "bill-a",
        settledAmount: 700,
        confirmedPendingAmount: 700,
        billNumber: "INV-1",
      },
      {
        outstandingId: "bill-b",
        settledAmount: 300,
        confirmedPendingAmount: 600,
        billNumber: "INV-2",
      },
    ],
    allocationStatus: "confirmed" as const,
    narration: "Collection",
    chequeNumber: "",
    chequeDate: null,
  };
}

test("Create Receipt requires a complete draft and confirmed allocation", () => {
  const input = createReviewInput();
  assert.equal(getReceiptReviewValidationError(input), null);
  assert.equal(
    getReceiptReviewValidationError({
      ...input,
      allocationStatus: "in_progress",
    }),
    "Confirm the Outstanding allocation before reviewing this Receipt",
  );
  assert.equal(
    getReceiptReviewValidationError({ ...input, draftCompanyId: "company-b" }),
    "This Receipt does not belong to the selected company",
  );
});

test("confirmation totals preserve confirmed settlement and advance values", () => {
  const input = createReviewInput();
  assert.equal(calculateReceiptTotalSettled(input.allocations), 1000);
  assert.equal(calculateReceiptRemainingAmount(1000, input.allocations), 0);

  const advanceInput = { ...input, allocations: [] };
  assert.equal(getReceiptReviewValidationError(advanceInput), null);
  assert.equal(calculateReceiptRemainingAmount(1000, []), 1000);
});

test("first-save refresh rejects changed or missing Outstanding rows", () => {
  const allocations = createReviewInput().allocations;
  assert.equal(
    getStaleReceiptAllocationError(allocations, [
      createBill("bill-a", 500),
      createBill("bill-b", 600),
    ]),
    "An Outstanding balance changed after confirmation. Review the allocation again.",
  );
  assert.equal(
    getStaleReceiptAllocationError(allocations, [createBill("bill-a", 700)]),
    "A selected Outstanding bill is no longer available. Reallocate the Receipt.",
  );
  assert.equal(
    getStaleReceiptAllocationError(allocations, [
      createBill("bill-a", 700),
      createBill("bill-b", 600),
    ]),
    null,
  );
});

test("canonical payload contains only minimal settlement rows", () => {
  const payload = buildReceiptCreatePayload(createReviewInput());
  assert.deepEqual(payload, {
    cmp_id: "company-a",
    request_id: "request-a",
    voucher_type: "receipt",
    series_id: "series-a",
    date: "2026-09-28",
    party_id: "party-a",
    party_name: "party-a",
    cash_bank_id: "cash-a",
    cash_bank_name: "cash-a",
    cash_bank_type: "cash",
    instrument_type: "cash",
    amount: 1000,
    settlement_details: [
      { outstanding: "bill-a", settled_amount: 700 },
      { outstanding: "bill-b", settled_amount: 300 },
    ],
    narration: "Collection",
    cheque_number: null,
    cheque_date: null,
  });
  assert.equal("confirmedPendingAmount" in payload.settlement_details[0], false);
  assert.equal("billNumber" in payload.settlement_details[0], false);
});

test("canonical payload maps bank Cheque fields and permits full advance", () => {
  const input = createReviewInput();
  const payload = buildReceiptCreatePayload({
    ...input,
    selectedCashBank: createParty("bank-a", "bank"),
    instrumentType: "cheque",
    allocations: [],
    chequeNumber: " CHQ-42 ",
    chequeDate: "2026-09-29",
  });

  assert.equal(payload.cash_bank_type, "bank");
  assert.equal(payload.instrument_type, "cheque");
  assert.equal(payload.cheque_number, "CHQ-42");
  assert.equal(payload.cheque_date, "2026-09-29");
  assert.deepEqual(payload.settlement_details, []);
});

test("recovery parsing is isolated by both user and company", () => {
  const payload = createPayload("request-recovery");
  const recovery = {
    version: 1 as const,
    userId: "user-a",
    companyId: "company-a",
    seriesName: "Receipt",
    payload,
    state: "uncertain" as const,
    savedAt: "2026-09-28T10:00:00.000Z",
  };
  const storedValue = JSON.stringify(recovery);

  assert.notEqual(
    getReceiptRecoveryStorageKey("user-a", "company-a"),
    getReceiptRecoveryStorageKey("user-b", "company-a"),
  );
  assert.notEqual(
    getReceiptRecoveryStorageKey("user-a", "company-a"),
    getReceiptRecoveryStorageKey("user-a", "company-b"),
  );
  assert.deepEqual(
    parseReceiptSubmissionRecovery(storedValue, "user-a", "company-a"),
    recovery,
  );
  assert.equal(
    parseReceiptSubmissionRecovery(storedValue, "user-b", "company-a"),
    null,
  );
  assert.equal(
    parseReceiptSubmissionRecovery(storedValue, "user-a", "company-b"),
    null,
  );
  assert.equal(areReceiptRecoveryPayloadsEqual(payload, { ...payload }), true);
  assert.equal(
    areReceiptRecoveryPayloadsEqual(payload, { ...payload, amount: 1001 }),
    false,
  );
});

test("recovered submissions restore the exact frozen request as retry-only", () => {
  const payload = createPayload("request-recovery");
  const state = receiptDraftReducer(
    undefined,
    restoreReceiptSubmission({
      version: 1,
      userId: "user-a",
      companyId: "company-a",
      seriesName: "Receipt",
      payload,
      state: "submitting",
      savedAt: "2026-09-28T10:00:00.000Z",
    }),
  );

  assert.deepEqual(state.submittedPayload, payload);
  assert.equal(state.requestId, "request-recovery");
  assert.equal(state.submissionRecoveryState, "uncertain");
  const editedState = receiptDraftReducer(state, setReceiptAmount("2000"));
  assert.equal(editedState.receiptAmount, "1000");
  assert.deepEqual(editedState.submittedPayload, payload);
});

test("confirmation sheet freezes before POST and handles replay, conflict, retry, and success", () => {
  const createSource = readFileSync(
    path.join(process.cwd(), "src/app/receipt-create.tsx"),
    "utf8",
  );
  const allocationSource = readFileSync(
    path.join(process.cwd(), "src/app/receipt-allocation.tsx"),
    "utf8",
  );
  assert.match(createSource, /ReceiptConfirmationSheet/);
  assert.match(createSource, /handleOpenAllocation/);
  assert.match(createSource, /Create Receipt/);
  assert.match(createSource, /navigation\.addListener\("beforeRemove"/);
  assert.match(createSource, /isDraftLockedRef/);
  assert.match(createSource, /isSuccessfulNavigationRef/);
  assert.match(createSource, /DiscardDraftSheet/);
  assert.match(createSource, /Start new Receipt/);
  assert.match(createSource, /handleStartNewReceipt/);
  assert.match(createSource, /fresh UUID/);
  const receiptDetailSource = readFileSync(
    path.join(process.cwd(), "src/app/receipt-detail.tsx"),
    "utf8",
  );
  assert.match(receiptDetailSource, /Settled bills/);
  assert.match(receiptDetailSource, /VoucherDetailHero/);
  assert.match(receiptDetailSource, /VoucherDetailCard/);
  assert.match(receiptDetailSource, /remaining_outstanding_amount/);
  assert.match(receiptDetailSource, /DisabledAction/);
  assert.match(receiptDetailSource, /Cheque details/);
  assert.match(receiptDetailSource, /No narration was added/);
  const confirmationSheetSource = readFileSync(
    path.join(
      process.cwd(),
      "src/components/receipt-create/ReceiptConfirmationSheet.tsx",
    ),
    "utf8",
  );
  assert.match(confirmationSheetSource, /pathname: "\/receipt-detail"/);
  assert.match(confirmationSheetSource, /QUERY_KEYS\.outstanding/);
  assert.match(confirmationSheetSource, /Retry Receipt/);
  assert.match(confirmationSheetSource, /Start a new Receipt to continue/);
  assert.match(confirmationSheetSource, /onSuccessfulNavigation\(\)/);
  const discardSheetSource = readFileSync(
    path.join(
      process.cwd(),
      "src/components/voucher-create/DiscardDraftSheet.tsx",
    ),
    "utf8",
  );
  assert.match(discardSheetSource, /enableDynamicSizing/);
  assert.doesNotMatch(discardSheetSource, /SNAP_POINTS/);
  assert.match(
    confirmationSheetSource,
    /router\.replace\([\s\S]*?clearReceiptDraft\(\)/,
  );
  assert.match(
    readFileSync(path.join(process.cwd(), "src/app/sale-create.tsx"), "utf8"),
    /DiscardDraftSheet/,
  );
  assert.match(
    readFileSync(path.join(process.cwd(), "src/app/sale-order-create.tsx"), "utf8"),
    /DiscardDraftSheet/,
  );
  assert.doesNotMatch(createSource, /receipt-review/);
  assert.match(allocationSource, /ReceiptAmountSection/);
  assert.match(allocationSource, /setReceiptAmount/);
  assert.match(allocationSource, /usePartyByIdQuery/);
  assert.match(allocationSource, /useReceiptOutstandingQuery/);
  assert.doesNotMatch(allocationSource, /useInfiniteReceiptOutstandingQuery/);
  assert.doesNotMatch(allocationSource, /Load more bills/);
  assert.match(allocationSource, /totalReceivable/);
  assert.match(allocationSource, /Net after customer credits/);
  assert.match(allocationSource, /KeyboardAvoidingView/);
  assert.doesNotMatch(allocationSource, /ListHeaderComponent/);
  assert.doesNotMatch(allocationSource, /ReceiptAllocationSummary/);
  assert.doesNotMatch(allocationSource, /useCreateReceiptMutation/);
  assert.doesNotMatch(
    readFileSync(path.join(process.cwd(), "src/app/_layout.tsx"), "utf8"),
    /receipt-review/,
  );

  const source = readFileSync(
    path.join(
      process.cwd(),
      "src/components/receipt-create/ReceiptConfirmationSheet.tsx",
    ),
    "utf8",
  );
  assert.match(
    source,
    /setReceiptSubmittedPayload\(payload\)[\s\S]{0,180}await submitFrozenPayload\(payload\)/,
  );
  assert.match(source, /createReceiptMutation\.mutateAsync\(payload\)/);
  assert.match(source, /response\.data\.cashTransaction/);
  assert.match(source, /dispatch\(clearReceiptDraft\(\)\)/);
  assert.match(source, /response\.idempotent_replay/);
  assert.match(source, /status === 409/);
  assert.match(source, /markRecoverableFailure\(payload, "conflict"\)/);
  assert.match(source, /markRecoverableFailure\(payload, "uncertain"\)/);
  assert.match(source, /if \(isSubmittingRef\.current \|\| isBusy/);
  assert.match(source, /router\.replace\(\{ pathname: "\/receipt-detail"/);
  assert.match(source, /receiptSubmissionRecoveryService\.clear/);
  assert.match(source, /QUERY_KEYS\.outstanding/);
  assert.match(source, /cashBankQueryKeys\.all/);
  assert.match(source, /enableDynamicSizing/);
  assert.doesNotMatch(source, /SNAP_POINTS/);
  assert.doesNotMatch(source, /PartyLedger|CashBankLedger|PartyMonthlyBalance/);
});
