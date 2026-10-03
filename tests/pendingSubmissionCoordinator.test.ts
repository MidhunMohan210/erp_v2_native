import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createPendingSubmissionReconciliationCoordinator,
  type PendingSubmissionReconciliationContext,
} from "../src/services/pendingSubmissions/pendingSubmissionReconciliationCoordinator";
import type { PendingSubmissionReconciliationReport } from "../src/services/pendingSubmissions/pendingSubmission.types";

const readyContext: PendingSubmissionReconciliationContext = {
  userId: "user-a",
  companyId: "company-a",
  isAuthenticated: true,
  isAuthLoading: false,
  isCompanyLoading: false,
};

function emptyReport(): PendingSubmissionReconciliationReport {
  return {
    resolved: [],
    retryAvailable: [],
    stillUncertain: [],
    conflicts: [],
  };
}

function createCoordinator() {
  const calls: { userId: string; companyId: string }[] = [];
  const coordinator = createPendingSubmissionReconciliationCoordinator({
    reconcilePendingSubmissions: async (userId, companyId) => {
      calls.push({ userId, companyId });
      return emptyReport();
    },
    initialAppState: "active",
  });
  return { coordinator, calls };
}

test("ready auth, company, and online connectivity reconcile once at startup", async () => {
  const { coordinator, calls } = createCoordinator();
  await coordinator.setContext(readyContext);
  assert.equal(calls.length, 0);
  await coordinator.setOnline(true);
  assert.deepEqual(calls, [{ userId: "user-a", companyId: "company-a" }]);
});

test("logged out, hydrating, company-less, and offline contexts do not reconcile", async () => {
  const { coordinator, calls } = createCoordinator();
  await coordinator.setOnline(true);
  await coordinator.setContext({ ...readyContext, isAuthenticated: false });
  await coordinator.setContext({ ...readyContext, isAuthLoading: true });
  await coordinator.setContext({ ...readyContext, companyId: null });
  assert.equal(calls.length, 0);
});

test("offline to online reconciles, but repeated online notifications do not", async () => {
  const { coordinator, calls } = createCoordinator();
  await coordinator.setContext(readyContext);
  await coordinator.setOnline(false);
  assert.equal(calls.length, 0);
  await coordinator.setOnline(true);
  await coordinator.setOnline(true);
  assert.equal(calls.length, 1);
});

test("only a background or inactive return to active reconciles", async () => {
  const { coordinator, calls } = createCoordinator();
  await coordinator.setContext(readyContext);
  await coordinator.setOnline(true);
  await coordinator.handleAppStateChange("active");
  await coordinator.handleAppStateChange("background");
  await coordinator.handleAppStateChange("active");
  await coordinator.handleAppStateChange("active");
  assert.equal(calls.length, 2);
});

test("a company switch reconciles the new company without touching the old scope", async () => {
  const { coordinator, calls } = createCoordinator();
  await coordinator.setOnline(true);
  await coordinator.setContext(readyContext);
  await coordinator.setContext({ ...readyContext, companyId: "company-b" });
  assert.deepEqual(calls, [
    { userId: "user-a", companyId: "company-a" },
    { userId: "user-a", companyId: "company-b" },
  ]);
});

test("a company switch can start while the previous company lookup is still running", async () => {
  const calls: string[] = [];
  let resolveCompanyA: (() => void) | undefined;
  const companyALookup = new Promise<void>((resolve) => {
    resolveCompanyA = resolve;
  });
  const coordinator = createPendingSubmissionReconciliationCoordinator({
    reconcilePendingSubmissions: async (_userId, companyId) => {
      calls.push(companyId);
      if (companyId === "company-a") await companyALookup;
      return emptyReport();
    },
  });

  await coordinator.setOnline(true);
  const firstRun = coordinator.setContext(readyContext);
  await Promise.resolve();
  const companyBRun = coordinator.setContext({ ...readyContext, companyId: "company-b" });
  assert.deepEqual(calls, ["company-a", "company-b"]);
  resolveCompanyA?.();
  await Promise.all([firstRun, companyBRun]);
});

test("logout stops future automatic reconciliation", async () => {
  const { coordinator, calls } = createCoordinator();
  await coordinator.setOnline(true);
  await coordinator.setContext(readyContext);
  await coordinator.setContext({ ...readyContext, userId: null, isAuthenticated: false });
  await coordinator.setOnline(false);
  await coordinator.setOnline(true);
  await coordinator.handleAppStateChange("background");
  await coordinator.handleAppStateChange("active");
  assert.equal(calls.length, 1);
});

test("rapid ready, online, and foreground signals share one active reconciliation", async () => {
  let calls = 0;
  let resolveReconciliation: (() => void) | undefined;
  const reconciliation = new Promise<void>((resolve) => {
    resolveReconciliation = resolve;
  });
  const coordinator = createPendingSubmissionReconciliationCoordinator({
    reconcilePendingSubmissions: async () => {
      calls += 1;
      await reconciliation;
      return emptyReport();
    },
    initialAppState: "background",
  });

  await coordinator.setOnline(true);
  const contextRun = coordinator.setContext(readyContext);
  const foregroundRun = coordinator.handleAppStateChange("active");
  resolveReconciliation?.();
  await Promise.all([contextRun, foregroundRun]);
  assert.equal(calls, 1);
});

test("the coordinator has no POST or create-screen dependency", () => {
  const coordinatorSource = readFileSync(
    "src/components/store/PendingSubmissionReconciliationCoordinator.tsx",
    "utf8",
  );
  assert.doesNotMatch(coordinatorSource, /\.post\(/);
  assert.doesNotMatch(coordinatorSource, /receipt-create|sale-create|sale-order-create/);
});
