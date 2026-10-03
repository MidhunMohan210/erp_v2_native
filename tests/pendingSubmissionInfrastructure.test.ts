import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createPendingSubmissionStorage,
  type AsyncKeyValueStorage,
  type PendingSubmissionStorage,
} from "../src/services/pendingSubmissions/pendingSubmissionStorage.service";
import { createPendingSubmissionReconciler } from "../src/services/pendingSubmissions/pendingSubmissionReconciliation.service";
import type {
  PendingSubmission,
  PendingTransactionType,
  ReconciliationResult,
} from "../src/services/pendingSubmissions/pendingSubmission.types";
import {
  reconcileReceiptPendingSubmission,
} from "../src/services/pendingSubmissions/handlers/receiptPendingSubmission.handler";
import { reconcileSalePendingSubmission } from "../src/services/pendingSubmissions/handlers/salePendingSubmission.handler";
import {
  reconcileSaleOrderPendingSubmission,
} from "../src/services/pendingSubmissions/handlers/saleOrderPendingSubmission.handler";
import type { PendingSubmissionApiClient } from "../src/services/pendingSubmissions/handlers/pendingSubmissionLookup.handler";
import {
  createLegacyReceiptRecoveryMigrator,
} from "../src/services/pendingSubmissions/legacyReceiptRecoveryMigration.service";
import {
  getReceiptPendingSubmissionId,
  saveReceiptPendingSubmission,
} from "../src/services/pendingSubmissions/receiptPendingSubmission.service";
import {
  getSalePendingSubmissionId,
  saveSalePendingSubmission,
} from "../src/services/pendingSubmissions/salePendingSubmission.service";
import {
  getSaleOrderPendingSubmissionId,
  saveSaleOrderPendingSubmission,
} from "../src/services/pendingSubmissions/saleOrderPendingSubmission.service";
import { subscribeToPendingSubmissionResolution } from "../src/services/pendingSubmissions/pendingSubmissionResolutionEvents";
import { createPendingSubmissionRetryDispatcher } from "../src/services/pendingSubmissions/pendingSubmissionRetry.service";
import { getPendingSubmissionDisplayData } from "../src/services/pendingSubmissions/pendingSubmissionDisplay.service";
import {
  createNewFromRejectedPendingSubmission,
  dismissRejectedPendingSubmission,
  getFreshCreateRoute,
} from "../src/services/pendingSubmissions/rejectedPendingSubmissionCleanup.service";
import {
  dismissConflictPendingSubmission,
  getExistingTransactionRoute,
  viewExistingConflictSubmission,
} from "../src/services/pendingSubmissions/conflictPendingSubmission.service";
import { subscribeToPendingSubmissionChanges } from "../src/services/pendingSubmissions/pendingSubmissionChangeEvents";
import { getReceiptRecoveryStorageKey } from "../src/utils/receiptRecovery";
import type { CreateReceiptRequest } from "../src/types/receipt";

class MemoryStorage implements AsyncKeyValueStorage {
  private values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }

  async setRaw(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

function createSubmission(
  overrides: Partial<PendingSubmission> = {},
): PendingSubmission {
  return {
    id: "pending-1",
    transactionType: "receipt",
    userId: "user-a",
    companyId: "company-a",
    requestId: "request-1",
    payload: { request_id: "request-1", nested: { amount: 100 } },
    status: "uncertain",
    createdAt: "2026-10-03T10:00:00.000Z",
    updatedAt: "2026-10-03T10:00:00.000Z",
    ...overrides,
  };
}

function createReceiptPayload(requestId = "receipt-request-1"): CreateReceiptRequest {
  return {
    cmp_id: "company-a",
    request_id: requestId,
    voucher_type: "receipt",
    series_id: "series-a",
    date: "2026-10-03",
    party_id: "party-a",
    party_name: "Party A",
    cash_bank_id: "cash-a",
    cash_bank_name: "Cash A",
    cash_bank_type: "cash",
    instrument_type: "cash",
    amount: 100,
    settlement_details: [],
    narration: null,
    cheque_number: null,
    cheque_date: null,
  };
}

function createSalePayload(requestId = "sale-request-1") {
  return {
    request_id: requestId,
    selectedSeries: { _id: "series-a" },
    transactionDate: "2026-10-03",
    partyId: "party-a",
    priceLevelId: null,
    items: [{
      itemId: "item-a",
      godownId: "godown-a",
      godownStockRowId: "stock-a",
      selectedUnit: "pcs",
      actualQty: 1,
      billedQty: 1,
      rate: 100,
      taxInclusive: false,
      discountType: "amount",
      discountValue: 0,
    }],
    additionalCharges: [],
    despatchDetails: {},
  };
}

function createSaleOrderPayload(requestId = "sale-order-request-1") {
  return {
    request_id: requestId,
    cmp_id: "company-a",
    cmpId: "company-a",
    transactionDate: "2026-10-03",
    items: [{ id: "item-a", billedQty: 1, rate: 100 }],
  };
}

function createStorage(memory = new MemoryStorage()) {
  return {
    memory,
    storage: createPendingSubmissionStorage(
      memory,
      () => "2026-10-03T10:01:00.000Z",
    ),
  };
}

test("storage saves, reads, updates, and removes a scoped pending submission", async () => {
  const { storage } = createStorage();
  const submission = createSubmission();
  await storage.save(submission);
  assert.deepEqual(await storage.getById("user-a", "company-a", "pending-1"), submission);

  const updated = await storage.update("user-a", "company-a", "pending-1", {
    status: "checking",
    lastError: "Checking the server",
  });
  assert.equal(updated?.status, "checking");
  assert.equal(updated?.lastError, "Checking the server");
  assert.equal(updated?.updatedAt, "2026-10-03T10:01:00.000Z");

  await storage.remove("user-a", "company-a", "pending-1");
  assert.equal(await storage.getById("user-a", "company-a", "pending-1"), null);
});

test("storage replaces the same logical request without adding a duplicate", async () => {
  const { storage } = createStorage();
  await storage.save(createSubmission());
  await storage.save(createSubmission({ id: "pending-replaced", status: "retry_available" }));
  const items = await storage.listForUserAndCompany("user-a", "company-a");
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "pending-replaced");
  assert.equal(items[0].status, "retry_available");
});

test("storage also prevents a duplicate local ID from referring to two requests", async () => {
  const { storage } = createStorage();
  await storage.save(createSubmission());
  await storage.save(createSubmission({ requestId: "request-2" }));
  const items = await storage.listForUserAndCompany("user-a", "company-a");
  assert.equal(items.length, 1);
  assert.equal(items[0].requestId, "request-2");
});

test("storage keeps separate request IDs, companies, transaction types, and users isolated", async () => {
  const { storage } = createStorage();
  await storage.save(createSubmission());
  await storage.save(createSubmission({ id: "pending-2", requestId: "request-2" }));
  await storage.save(createSubmission({ id: "pending-3", companyId: "company-b" }));
  await storage.save(createSubmission({ id: "pending-4", transactionType: "sale" }));
  await storage.save(createSubmission({ id: "pending-5", userId: "user-b" }));

  assert.equal((await storage.listForUserAndCompany("user-a", "company-a")).length, 3);
  assert.equal((await storage.listForUserAndCompany("user-a", "company-b")).length, 1);
  assert.equal((await storage.list("user-b")).length, 1);
  assert.equal(await storage.getById("user-b", "company-a", "pending-1"), null);
});

test("storage safely ignores malformed JSON, old versions, and corrupt records", async () => {
  const { storage, memory } = createStorage();
  await memory.setRaw("erp.pending-submissions.v1:user:user-a", "not-json");
  assert.deepEqual(await storage.list("user-a"), []);

  await memory.setRaw(
    "erp.pending-submissions.v1:user:user-a",
    JSON.stringify({ version: 0, submissions: [createSubmission()] }),
  );
  assert.deepEqual(await storage.list("user-a"), []);

  await memory.setRaw(
    "erp.pending-submissions.v1:user:user-a",
    JSON.stringify({ version: 1, submissions: [createSubmission(), { id: "broken" }] }),
  );
  assert.equal((await storage.list("user-a")).length, 1);
});

test("storage serialises a frozen payload without changing it", async () => {
  const { storage } = createStorage();
  const payload = Object.freeze({ request_id: "request-1", nested: Object.freeze({ amount: 100 }) });
  const submission = createSubmission({ payload });
  await storage.save(submission);
  await storage.update("user-a", "company-a", "pending-1", { status: "checking" });
  assert.deepEqual((await storage.getById("user-a", "company-a", "pending-1"))?.payload, payload);
  assert.deepEqual(payload, { request_id: "request-1", nested: { amount: 100 } });
});

test("Receipt pending helper preserves the first exact payload and logical ID", async () => {
  const { storage } = createStorage();
  const payload = Object.freeze(createReceiptPayload());
  const first = await saveReceiptPendingSubmission(
    { userId: "user-a", companyId: "company-a", payload, status: "uncertain" },
    storage,
    () => "2026-10-03T10:00:00.000Z",
  );
  const second = await saveReceiptPendingSubmission(
    {
      userId: "user-a",
      companyId: "company-a",
      payload: { ...payload, amount: 999 },
      status: "uncertain",
    },
    storage,
    () => "2026-10-03T10:01:00.000Z",
  );

  assert.equal(first.id, getReceiptPendingSubmissionId(payload.request_id));
  assert.equal(second.createdAt, first.createdAt);
  assert.deepEqual(second.payload, payload);
  assert.equal((await storage.listForUserAndCompany("user-a", "company-a")).length, 1);
});

test("Sale pending helper preserves the first exact payload and logical ID", async () => {
  const { storage } = createStorage();
  const payload = Object.freeze(createSalePayload());
  const changedPayload = { ...payload, partyId: "changed-party" };
  const first = await saveSalePendingSubmission(
    { userId: "user-a", companyId: "company-a", payload, status: "uncertain" },
    storage,
    () => "2026-10-03T10:00:00.000Z",
  );
  const second = await saveSalePendingSubmission(
    {
      userId: "user-a",
      companyId: "company-a",
      payload: changedPayload,
      status: "uncertain",
    },
    storage,
    () => "2026-10-03T10:01:00.000Z",
  );

  assert.equal(first.id, getSalePendingSubmissionId(payload.request_id));
  assert.equal(second.createdAt, first.createdAt);
  assert.deepEqual(second.payload, payload);
  assert.equal((await storage.listForUserAndCompany("user-a", "company-a")).length, 1);
});

test("Sale Order pending helper preserves the first exact payload and logical ID", async () => {
  const { storage } = createStorage();
  const payload = Object.freeze(createSaleOrderPayload());
  const changedPayload = { ...payload, transactionDate: "2026-10-04" };
  const first = await saveSaleOrderPendingSubmission(
    { userId: "user-a", companyId: "company-a", payload, status: "uncertain" },
    storage,
    () => "2026-10-03T10:00:00.000Z",
  );
  const second = await saveSaleOrderPendingSubmission(
    {
      userId: "user-a",
      companyId: "company-a",
      payload: changedPayload,
      status: "uncertain",
    },
    storage,
    () => "2026-10-03T10:01:00.000Z",
  );

  assert.equal(first.id, getSaleOrderPendingSubmissionId(payload.request_id));
  assert.equal(second.createdAt, first.createdAt);
  assert.deepEqual(second.payload, payload);
  assert.equal((await storage.listForUserAndCompany("user-a", "company-a")).length, 1);
});

test("valid legacy Receipt recovery migrates once and removes only the old key", async () => {
  const { storage, memory } = createStorage();
  const payload = createReceiptPayload("legacy-receipt-request");
  const legacyKey = getReceiptRecoveryStorageKey("user-a", "company-a");
  await memory.setRaw(
    legacyKey,
    JSON.stringify({
      version: 1,
      userId: "user-a",
      companyId: "company-a",
      seriesName: "Receipt",
      payload,
      state: "submitting",
      savedAt: "2026-10-03T10:00:00.000Z",
    }),
  );

  const migrator = createLegacyReceiptRecoveryMigrator(
    memory,
    storage,
    () => "2026-10-03T10:01:00.000Z",
  );
  assert.equal(await migrator.migrate("user-a", "company-a"), true);
  assert.equal(await migrator.migrate("user-a", "company-a"), false);
  assert.equal(await memory.getItem(legacyKey), null);

  const migrated = await storage.getById(
    "user-a",
    "company-a",
    getReceiptPendingSubmissionId(payload.request_id),
  );
  assert.equal(migrated?.status, "uncertain");
  assert.deepEqual(migrated?.payload, payload);
  assert.equal((await storage.listForUserAndCompany("user-a", "company-a")).length, 1);
});

test("malformed legacy Receipt recovery is retained instead of fabricated", async () => {
  const { storage, memory } = createStorage();
  const legacyKey = getReceiptRecoveryStorageKey("user-a", "company-a");
  await memory.setRaw(legacyKey, "not-json");
  const migrator = createLegacyReceiptRecoveryMigrator(memory, storage);
  assert.equal(await migrator.migrate("user-a", "company-a"), false);
  assert.equal(await memory.getItem(legacyKey), "not-json");
  assert.equal((await storage.list("user-a")).length, 0);
});

function getHandler(transactionType: PendingTransactionType) {
  if (transactionType === "receipt") return reconcileReceiptPendingSubmission;
  if (transactionType === "sale") return reconcileSalePendingSubmission;
  return reconcileSaleOrderPendingSubmission;
}

function getExpectedPath(transactionType: PendingTransactionType): string {
  if (transactionType === "receipt") return "/api/cash-transactions/by-request-id/request-1";
  if (transactionType === "sale") return "/api/sales/by-request-id/request-1";
  return "/api/sale-orders/by-request-id/request-1";
}

function foundResponse(transactionType: PendingTransactionType) {
  return {
    success: true,
    data: {
      exists: true,
      transaction_type: transactionType,
      request_id: "request-1",
      id: `${transactionType}-server-id`,
      voucher_number: "V-100",
    },
  };
}

function error(status?: number, message = "Request failed", code?: string): Error & { response?: { status: number }; code?: string } {
  const result = Object.assign(new Error(message), code ? { code } : {});
  return status ? Object.assign(result, { response: { status } }) : result;
}

function clientThat(
  action: () => Promise<{ data: unknown }>,
): PendingSubmissionApiClient {
  return { get: async () => action() };
}

for (const transactionType of ["receipt", "sale", "sale_order"] as const) {
  test(`${transactionType} handler returns found for a matching 200 response`, async () => {
    let calledPath = "";
    const client: PendingSubmissionApiClient = {
      get: async (url) => {
        calledPath = url;
        return { data: foundResponse(transactionType) };
      },
    };
    const result = await getHandler(transactionType)(
      createSubmission({ transactionType }),
      client,
    );
    assert.deepEqual(result, {
      status: "found",
      transactionId: `${transactionType}-server-id`,
      voucherNumber: "V-100",
    });
    assert.equal(calledPath, getExpectedPath(transactionType));
  });

  test(`${transactionType} handler keeps 404, timeout, network, 500, 401, and malformed responses unresolved`, async () => {
    const submission = createSubmission({ transactionType });
    const handler = getHandler(transactionType);
    assert.equal((await handler(submission, clientThat(async () => { throw error(404); }))).status, "not_found");
    assert.equal((await handler(submission, clientThat(async () => { throw error(undefined, "timeout", "ECONNABORTED"); }))).status, "unavailable");
    assert.equal((await handler(submission, clientThat(async () => { throw error(); }))).status, "unavailable");
    assert.equal((await handler(submission, clientThat(async () => { throw error(500); }))).status, "unavailable");
    const unauthorized = await handler(submission, clientThat(async () => { throw error(401); }));
    assert.equal(unauthorized.status === "unavailable" ? unauthorized.reason : "", "authentication");
    const malformed = await handler(submission, clientThat(async () => ({ data: { success: true, data: {} } })));
    assert.equal(malformed.status === "unavailable" ? malformed.reason : "", "malformed_response");
  });
}

test("a found result removes the pending record without making a POST", async () => {
  const { storage } = createStorage();
  const submission = createSubmission({ transactionType: "sale" });
  await storage.save(submission);
  let getCalls = 0;
  const reconciler = createPendingSubmissionReconciler({
    storage,
    handlers: {
      sale: async () => {
        getCalls += 1;
        return { status: "found", transactionId: "sale-server" };
      },
    },
  });
  const report = await reconciler.reconcilePendingSubmissions("user-a", "company-a");
  assert.equal(getCalls, 1);
  assert.equal(report.resolved[0]?.transactionId, "sale-server");
  assert.equal(await storage.getById("user-a", "company-a", "pending-1"), null);
});

test("a found Receipt lookup emits a resolution event for an active Receipt screen", async () => {
  const { storage } = createStorage();
  const payload = createReceiptPayload();
  await saveReceiptPendingSubmission(
    { userId: "user-a", companyId: "company-a", payload, status: "uncertain" },
    storage,
  );
  let resolvedRequestId = "";
  const unsubscribe = subscribeToPendingSubmissionResolution((event) => {
    resolvedRequestId = event.requestId;
  });
  const reconciler = createPendingSubmissionReconciler({
    storage,
    handlers: {
      receipt: async () => ({ status: "found", transactionId: "receipt-server-id" }),
    },
  });
  await reconciler.reconcilePendingSubmissions("user-a", "company-a");
  unsubscribe();
  assert.equal(resolvedRequestId, payload.request_id);
  assert.equal(
    await storage.getById(
      "user-a",
      "company-a",
      getReceiptPendingSubmissionId(payload.request_id),
    ),
    null,
  );
});

test("a found Sale lookup emits a resolution event for an active Sale screen", async () => {
  const { storage } = createStorage();
  const payload = createSalePayload();
  await saveSalePendingSubmission(
    { userId: "user-a", companyId: "company-a", payload, status: "uncertain" },
    storage,
  );
  let resolvedRequestId = "";
  const unsubscribe = subscribeToPendingSubmissionResolution((event) => {
    if (event.transactionType === "sale") resolvedRequestId = event.requestId;
  });
  const reconciler = createPendingSubmissionReconciler({
    storage,
    handlers: {
      sale: async () => ({ status: "found", transactionId: "sale-server-id" }),
    },
  });
  await reconciler.reconcilePendingSubmissions("user-a", "company-a");
  unsubscribe();
  assert.equal(resolvedRequestId, payload.request_id);
  assert.equal(
    await storage.getById(
      "user-a",
      "company-a",
      getSalePendingSubmissionId(payload.request_id),
    ),
    null,
  );
});

test("a found Sale Order lookup emits a resolution event for an active screen", async () => {
  const { storage } = createStorage();
  const payload = createSaleOrderPayload();
  await saveSaleOrderPendingSubmission(
    { userId: "user-a", companyId: "company-a", payload, status: "uncertain" },
    storage,
  );
  let resolvedRequestId = "";
  const unsubscribe = subscribeToPendingSubmissionResolution((event) => {
    if (event.transactionType === "sale_order") resolvedRequestId = event.requestId;
  });
  const reconciler = createPendingSubmissionReconciler({
    storage,
    handlers: {
      sale_order: async () => ({ status: "found", transactionId: "sale-order-server-id" }),
    },
  });
  await reconciler.reconcilePendingSubmissions("user-a", "company-a");
  unsubscribe();
  assert.equal(resolvedRequestId, payload.request_id);
  assert.equal(
    await storage.getById(
      "user-a",
      "company-a",
      getSaleOrderPendingSubmissionId(payload.request_id),
    ),
    null,
  );
});

test("Sale Create saves the exact payload before POST and Sale Edit stays separate", () => {
  const source = readFileSync("src/app/sale-create.tsx", "utf8");
  const createStart = source.indexOf("const submitFrozenSalePayload");
  const updateStart = source.indexOf("const handleUpdateSale");
  const createSource = source.slice(createStart, updateStart);
  const updateSource = source.slice(updateStart);

  assert.ok(createSource.indexOf("saveSalePendingSubmission") < createSource.indexOf("createSaleMutation.mutateAsync"));
  assert.match(createSource, /frozenPayload/);
  assert.doesNotMatch(source, /getSaleCreatePayloadSignature/);
  assert.doesNotMatch(updateSource, /PendingSubmission|saveSalePendingSubmission|removeSalePendingSubmission/);
});

test("Sale Order Create saves the exact payload before POST and Edit stays separate", () => {
  const createSource = readFileSync("src/app/sale-order-create.tsx", "utf8");
  const editSource = readFileSync("src/app/sale-order-edit.tsx", "utf8");
  const submitStart = createSource.indexOf("const submitFrozenSaleOrderPayload");
  const submitEnd = createSource.indexOf("const handleCreateSaleOrder");
  const submitSource = createSource.slice(submitStart, submitEnd);

  assert.ok(submitSource.indexOf("saveSaleOrderPendingSubmission") < submitSource.indexOf("createSaleOrderMutation.mutateAsync"));
  assert.match(createSource, /frozenPayload/);
  assert.match(createSource, /retry: false/);
  assert.doesNotMatch(editSource, /PendingSubmission|submittedPayload|setVoucherSubmission/);
});

function createRetryDispatcher(
  storage: PendingSubmissionStorage,
  overrides: Partial<{
    postReceipt: (payload: unknown) => Promise<{ idempotent_replay?: boolean }>;
    postSale: (payload: unknown, companyId: string) => Promise<{ idempotent_replay?: boolean }>;
    postSaleOrder: (payload: unknown) => Promise<{ idempotent_replay?: boolean }>;
    reconcile: (submission: PendingSubmission) => Promise<{ result: ReconciliationResult }>;
  }> = {},
) {
  return createPendingSubmissionRetryDispatcher({
    storage,
    postReceipt: async () => ({}),
    postSale: async () => ({}),
    postSaleOrder: async () => ({}),
    reconcile: async () => ({ result: { status: "not_found" } }),
    ...overrides,
  });
}

test("Pending display data reads each voucher payload without mixing accounting records", () => {
  assert.deepEqual(
    getPendingSubmissionDisplayData(
      createSubmission({
        transactionType: "receipt",
        payload: { party_name: "Receipt Party", amount: 500, date: "2026-10-03" },
      }),
    ),
    { title: "Receipt", partyName: "Receipt Party", amount: 500, transactionDate: "2026-10-03" },
  );
  assert.equal(
    getPendingSubmissionDisplayData(
      createSubmission({ transactionType: "sale_order", payload: { party: { partyName: "Order Party" }, finalAmount: 900 } }),
    ).partyName,
    "Order Party",
  );
  const saleDisplay = getPendingSubmissionDisplayData(
    createSubmission({ transactionType: "sale", payload: createSalePayload() }),
  );
  // A Sale retry payload stores the stable party ID, so Daybook can look up its name.
  assert.equal(saleDisplay.partyId, "party-a");
  assert.equal(saleDisplay.partyName, "Customer unavailable");
});

test("rejected Receipt, Sale, and Sale Order records offer fresh Create routes", () => {
  assert.equal(getFreshCreateRoute("receipt"), "/receipt-create");
  assert.equal(getFreshCreateRoute("sale"), "/sale-create");
  assert.equal(getFreshCreateRoute("sale_order"), "/sale-order-create");
});

test("Dismiss removes a rejected record locally and emits a pending-count update", async () => {
  const { storage } = createStorage();
  const rejected = createSubmission({ status: "rejected" });
  await storage.save(rejected);
  const changes: { userId: string; companyId: string | null }[] = [];
  const unsubscribe = subscribeToPendingSubmissionChanges((event) => {
    changes.push(event);
  });

  try {
    assert.equal(await dismissRejectedPendingSubmission(rejected, storage), true);
  } finally {
    unsubscribe();
  }

  assert.equal(await storage.getById("user-a", "company-a", rejected.id), null);
  assert.equal((await storage.listForUserAndCompany("user-a", "company-a")).length, 0);
  assert.deepEqual(changes, [{ userId: "user-a", companyId: "company-a" }]);
});

test("Create New removes each rejected record, resets its draft, and navigates to its Create screen", async () => {
  const cases: {
    transactionType: PendingSubmission["transactionType"];
    route: string;
  }[] = [
    { transactionType: "receipt", route: "/receipt-create" },
    { transactionType: "sale", route: "/sale-create" },
    { transactionType: "sale_order", route: "/sale-order-create" },
  ];

  for (const item of cases) {
    const { storage } = createStorage();
    const rejected = createSubmission({
      id: `rejected-${item.transactionType}`,
      requestId: `rejected-request-${item.transactionType}`,
      transactionType: item.transactionType,
      status: "rejected",
      payload: { request_id: `rejected-request-${item.transactionType}`, old: true },
    });
    const resetTypes: PendingSubmission["transactionType"][] = [];
    const routes: string[] = [];
    await storage.save(rejected);

    assert.equal(
      await createNewFromRejectedPendingSubmission(rejected, {
        storage,
        resetDraft: (transactionType) => resetTypes.push(transactionType),
        navigate: (route) => routes.push(route),
      }),
      true,
    );
    assert.equal(await storage.getById("user-a", "company-a", rejected.id), null);
    assert.deepEqual(resetTypes, [item.transactionType]);
    assert.deepEqual(routes, [item.route]);
  }
});

test("cleanup never removes or navigates conflict, retry-available, or uncertain records", async () => {
  const { storage } = createStorage();
  for (const status of ["conflict", "retry_available", "uncertain"] as const) {
    const submission = createSubmission({ id: status, status });
    const resetTypes: PendingSubmission["transactionType"][] = [];
    const routes: string[] = [];
    await storage.save(submission);

    assert.equal(await dismissRejectedPendingSubmission(submission, storage), false);
    assert.equal(
      await createNewFromRejectedPendingSubmission(submission, {
        storage,
        resetDraft: (transactionType) => resetTypes.push(transactionType),
        navigate: (route) => routes.push(route),
      }),
      false,
    );
    assert.notEqual(await storage.getById("user-a", "company-a", submission.id), null);
    assert.deepEqual(resetTypes, []);
    assert.deepEqual(routes, []);
  }
});

test("conflict Receipt, Sale, and Sale Order records use only their scoped GET lookup", async () => {
  const cases: {
    transactionType: PendingSubmission["transactionType"];
    route: string;
  }[] = [
    { transactionType: "receipt", route: "/receipt-detail" },
    { transactionType: "sale", route: "/sale-detail" },
    { transactionType: "sale_order", route: "/sale-order-detail" },
  ];

  for (const item of cases) {
    const calls: PendingSubmission["transactionType"][] = [];
    const submission = createSubmission({
      transactionType: item.transactionType,
      status: "conflict",
    });
    const result = await viewExistingConflictSubmission(submission, {
      lookupReceipt: async (value) => {
        calls.push(value.transactionType);
        return { status: "found", transactionId: "receipt-id" };
      },
      lookupSale: async (value) => {
        calls.push(value.transactionType);
        return { status: "found", transactionId: "sale-id" };
      },
      lookupSaleOrder: async (value) => {
        calls.push(value.transactionType);
        return { status: "found", transactionId: "sale-order-id" };
      },
    });

    assert.equal(result?.status, "found");
    assert.deepEqual(calls, [item.transactionType]);
    assert.equal(getExistingTransactionRoute(item.transactionType), item.route);
  }
});

test("a conflict lookup that is not found or unavailable keeps the local record", async () => {
  const { storage } = createStorage();
  const submission = createSubmission({ status: "conflict" });
  await storage.save(submission);

  const notFound = await viewExistingConflictSubmission(submission, {
    lookupReceipt: async () => ({ status: "not_found" }),
    lookupSale: async () => ({ status: "not_found" }),
    lookupSaleOrder: async () => ({ status: "not_found" }),
  });
  assert.equal(notFound?.status, "not_found");
  assert.notEqual(await storage.getById("user-a", "company-a", submission.id), null);

  const unavailable = await viewExistingConflictSubmission(submission, {
    lookupReceipt: async () => ({
      status: "unavailable",
      reason: "network",
      message: "offline",
    }),
    lookupSale: async () => ({
      status: "unavailable",
      reason: "network",
      message: "offline",
    }),
    lookupSaleOrder: async () => ({
      status: "unavailable",
      reason: "network",
      message: "offline",
    }),
  });
  assert.equal(unavailable?.status, "unavailable");
  assert.notEqual(await storage.getById("user-a", "company-a", submission.id), null);
});

test("conflict Dismiss removes only the local recovery record and emits a count update", async () => {
  const { storage } = createStorage();
  const submission = createSubmission({ status: "conflict" });
  await storage.save(submission);
  const changes: { userId: string; companyId: string | null }[] = [];
  const unsubscribe = subscribeToPendingSubmissionChanges((event) => {
    changes.push(event);
  });

  try {
    assert.equal(await dismissConflictPendingSubmission(submission, storage), true);
  } finally {
    unsubscribe();
  }

  assert.equal(await storage.getById("user-a", "company-a", submission.id), null);
  assert.deepEqual(changes, [{ userId: "user-a", companyId: "company-a" }]);
});

test("conflict actions never run for rejected, retry-available, or uncertain records", async () => {
  const { storage } = createStorage();
  for (const status of ["rejected", "retry_available", "uncertain"] as const) {
    const submission = createSubmission({ id: `not-conflict-${status}`, status });
    await storage.save(submission);
    const result = await viewExistingConflictSubmission(submission, {
      lookupReceipt: async () => ({ status: "not_found" }),
      lookupSale: async () => ({ status: "not_found" }),
      lookupSaleOrder: async () => ({ status: "not_found" }),
    });
    assert.equal(result, null);
    assert.equal(await dismissConflictPendingSubmission(submission, storage), false);
    assert.notEqual(await storage.getById("user-a", "company-a", submission.id), null);
  }
});

test("fresh Create screens generate new request IDs and do not reuse rejected payloads", () => {
  const receiptSource = readFileSync("src/app/receipt-create.tsx", "utf8");
  const saleSource = readFileSync("src/app/sale-create.tsx", "utf8");
  const saleOrderSource = readFileSync("src/app/sale-order-create.tsx", "utf8");
  const cleanupSource = readFileSync(
    "src/services/pendingSubmissions/rejectedPendingSubmissionCleanup.service.ts",
    "utf8",
  );
  const conflictSource = readFileSync(
    "src/services/pendingSubmissions/conflictPendingSubmission.service.ts",
    "utf8",
  );
  assert.match(receiptSource, /requestId: createReceiptRequestId\(\)/);
  assert.match(saleSource, /saleDraft\.request_id \?\? Crypto\.randomUUID\(\)/);
  assert.match(saleOrderSource, /requestId: Crypto\.randomUUID\(\)/);
  assert.doesNotMatch(cleanupSource, /submission\.payload/);
  assert.doesNotMatch(cleanupSource, /\.post\(/);
  assert.doesNotMatch(conflictSource, /\.post\(/);
});

test("manual retry posts the exact stored Receipt, Sale, and Sale Order payloads", async () => {
  const { storage } = createStorage();
  const submissions = [
    createSubmission({ id: "receipt", transactionType: "receipt", payload: createReceiptPayload() }),
    createSubmission({ id: "sale", transactionType: "sale", payload: createSalePayload() }),
    createSubmission({ id: "order", transactionType: "sale_order", payload: createSaleOrderPayload() }),
  ];
  for (const submission of submissions) await storage.save(submission);
  const calls: { type: string; payload: unknown; companyId?: string }[] = [];
  const dispatcher = createRetryDispatcher(storage, {
    postReceipt: async (payload) => { calls.push({ type: "receipt", payload }); return {}; },
    postSale: async (payload, companyId) => { calls.push({ type: "sale", payload, companyId }); return {}; },
    postSaleOrder: async (payload) => { calls.push({ type: "sale_order", payload }); return {}; },
  });
  for (const submission of submissions) {
    assert.equal((await dispatcher.retry(submission)).status, "success");
  }
  assert.deepEqual(calls.map((call) => call.payload), submissions.map((submission) => submission.payload));
  assert.equal(calls[1]?.companyId, "company-a");
});

test("manual retry removes confirmed 201 and replay 200 records", async () => {
  const { storage } = createStorage();
  const first = createSubmission({ id: "first", payload: createReceiptPayload("request-1") });
  const replay = createSubmission({ id: "replay", requestId: "request-replay", payload: createReceiptPayload("request-replay") });
  await storage.save(first);
  await storage.save(replay);
  const dispatcher = createRetryDispatcher(storage, {
    postReceipt: async (payload) =>
      (payload as { request_id?: string }).request_id === "request-replay"
        ? { idempotent_replay: true }
        : {},
  });
  assert.equal((await dispatcher.retry(first)).status, "success");
  assert.deepEqual(await dispatcher.retry(replay), { status: "success", wasReplay: true });
  assert.equal(await storage.getById("user-a", "company-a", "first"), null);
  assert.equal(await storage.getById("user-a", "company-a", "replay"), null);
});

for (const [label, failure] of [
  ["timeout", error(undefined, "timeout", "ECONNABORTED")],
  ["network", error()],
  ["408", error(408)],
  ["server", error(500)],
] as const) {
  test(`manual retry keeps ${label} failures uncertain`, async () => {
    const { storage } = createStorage();
    const submission = createSubmission();
    await storage.save(submission);
    const dispatcher = createRetryDispatcher(storage, {
      postReceipt: async () => { throw failure; },
    });
    assert.equal((await dispatcher.retry(submission)).status, "uncertain");
    assert.equal((await storage.getById("user-a", "company-a", submission.id))?.status, "uncertain");
  });
}

test("manual retry marks 409 as conflict and definite 4xx as rejected", async () => {
  const { storage } = createStorage();
  const conflict = createSubmission({ id: "conflict", payload: createReceiptPayload("request-1") });
  const rejected = createSubmission({ id: "rejected", requestId: "request-rejected", payload: createReceiptPayload("request-rejected") });
  await storage.save(conflict);
  await storage.save(rejected);
  const dispatcher = createRetryDispatcher(storage, {
    postReceipt: async (payload) => {
      if ((payload as { request_id?: string }).request_id === "request-rejected") throw error(422, "Invalid input");
      throw error(409);
    },
  });
  assert.equal((await dispatcher.retry(conflict)).status, "conflict");
  assert.equal((await dispatcher.retry(rejected)).status, "rejected");
  assert.equal((await storage.getById("user-a", "company-a", "conflict"))?.status, "conflict");
  assert.equal((await storage.getById("user-a", "company-a", "rejected"))?.status, "rejected");
});

test("manual retry shares one POST and check status delegates to GET reconciliation", async () => {
  const { storage } = createStorage();
  const submission = createSubmission();
  await storage.save(submission);
  let posts = 0;
  let checks = 0;
  let releasePost: (() => void) | undefined;
  const waitingPost = new Promise<void>((resolve) => { releasePost = resolve; });
  const dispatcher = createRetryDispatcher(storage, {
    postReceipt: async () => { posts += 1; await waitingPost; return {}; },
    reconcile: async () => { checks += 1; return { result: { status: "not_found" } }; },
  });
  const first = dispatcher.retry(submission);
  const second = dispatcher.retry(submission);
  releasePost?.();
  await Promise.all([first, second]);
  assert.equal(posts, 1);
  assert.equal((await dispatcher.checkStatus(submission)).status, "not_found");
  assert.equal(checks, 1);
});

test("Daybook keeps pending submissions separate from normal transaction queries", () => {
  const source = readFileSync("src/app/daybook.tsx", "utf8");
  assert.match(source, /activeView === "pending"/);
  assert.match(source, /usePendingSubmissionsQuery/);
  assert.match(source, /activeView === "transactions"/);
  assert.match(source, /Retry Sale Order|Retry/);
  assert.match(source, /const canCreateNew = item\.status === "rejected"/);
  assert.match(source, /Create New/);
  assert.match(source, /Dismiss/);
  assert.match(source, /const canViewExisting = item\.status === "conflict"/);
  assert.match(source, /View Existing/);
  assert.match(source, /Remove this pending conflict\?/);
  assert.match(source, /const canRetry = item\.status === "retry_available"/);
  assert.match(source, /const canCheck = item\.status === "uncertain" \|\| item\.status === "checking"/);
  assert.doesNotMatch(source, /item\.status === "conflict"[\s\S]{0,120}Create New/);
  assert.doesNotMatch(source, /item\.status === "conflict"[\s\S]{0,120}Retry submission/);
  assert.doesNotMatch(source, /voucher_number.*pendingSubmissions/);
});

test("pending reconciliation handlers expose no create POST path", () => {
  const handlerFiles = [
    "src/services/pendingSubmissions/handlers/receiptPendingSubmission.handler.ts",
    "src/services/pendingSubmissions/handlers/salePendingSubmission.handler.ts",
    "src/services/pendingSubmissions/handlers/saleOrderPendingSubmission.handler.ts",
    "src/services/pendingSubmissions/pendingSubmissionReconciliation.service.ts",
  ];
  for (const file of handlerFiles) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /\.post\(/);
  }
});

for (const [label, result] of [
  ["404", { status: "not_found" }],
  ["timeout", { status: "unavailable", reason: "timeout", message: "timeout" }],
  ["network", { status: "unavailable", reason: "network", message: "offline" }],
  ["500", { status: "unavailable", reason: "server", message: "server error" }],
  ["401", { status: "unavailable", reason: "authentication", message: "signed out" }],
  ["malformed response", { status: "unavailable", reason: "malformed_response", message: "bad data" }],
] as const) {
  test(`${label} keeps the correct unresolved reconciliation state`, async () => {
    const { storage } = createStorage();
    await storage.save(createSubmission());
    const reconciler = createPendingSubmissionReconciler({
      storage,
      handlers: { receipt: async () => result as ReconciliationResult },
    });
    await reconciler.reconcilePendingSubmissions("user-a", "company-a");
    const saved = await storage.getById("user-a", "company-a", "pending-1");
    assert.equal(saved?.status, label === "404" ? "retry_available" : "uncertain");
  });
}

test("handler normalises 404, timeout, network, 500, 401, and malformed responses", async () => {
  const submission = createSubmission();
  assert.equal((await reconcileReceiptPendingSubmission(submission, clientThat(async () => { throw error(404); }))).status, "not_found");
  assert.equal((await reconcileReceiptPendingSubmission(submission, clientThat(async () => { throw error(undefined, "timeout", "ECONNABORTED"); }))).status, "unavailable");
  assert.equal((await reconcileReceiptPendingSubmission(submission, clientThat(async () => { throw error(); }))).status, "unavailable");
  assert.equal((await reconcileReceiptPendingSubmission(submission, clientThat(async () => { throw error(500); }))).status, "unavailable");
  const unauthorized = await reconcileReceiptPendingSubmission(submission, clientThat(async () => { throw error(401); }));
  assert.deepEqual(unauthorized.status === "unavailable" ? unauthorized.reason : "", "authentication");
  const malformed = await reconcileReceiptPendingSubmission(submission, clientThat(async () => ({ data: { success: true, data: {} } })));
  assert.deepEqual(malformed.status === "unavailable" ? malformed.reason : "", "malformed_response");
});

test("concurrent reconciliation shares one lookup and an old checking state is recoverable", async () => {
  const { storage } = createStorage();
  await storage.save(createSubmission({ status: "checking" }));
  let calls = 0;
  let resolveLookup: ((value: ReconciliationResult) => void) | undefined;
  const lookup = new Promise<ReconciliationResult>((resolve) => { resolveLookup = resolve; });
  const reconciler = createPendingSubmissionReconciler({
    storage,
    handlers: { receipt: async () => { calls += 1; return lookup; } },
  });
  const first = reconciler.reconcilePendingSubmissions("user-a", "company-a");
  const second = reconciler.reconcilePendingSubmissions("user-a", "company-a");
  resolveLookup?.({ status: "not_found" });
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal((await storage.getById("user-a", "company-a", "pending-1"))?.status, "retry_available");
});
