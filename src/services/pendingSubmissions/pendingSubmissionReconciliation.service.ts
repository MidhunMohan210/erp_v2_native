import {
  reconcileReceiptPendingSubmission,
} from "./handlers/receiptPendingSubmission.handler";
import { reconcileSalePendingSubmission } from "./handlers/salePendingSubmission.handler";
import {
  reconcileSaleOrderPendingSubmission,
} from "./handlers/saleOrderPendingSubmission.handler";
import { emitPendingSubmissionResolution } from "./pendingSubmissionResolutionEvents";
import { pendingSubmissionStorageService, type PendingSubmissionStorage } from "./pendingSubmissionStorage.service";
import type {
  PendingSubmission,
  PendingSubmissionFailureReason,
  PendingSubmissionLookupHandler,
  PendingSubmissionReconciliationReport,
  ReconciliationResult,
  UnavailableReconciliationResult,
} from "./pendingSubmission.types";

type ReconciliationHandlers = {
  receipt?: PendingSubmissionLookupHandler;
  sale?: PendingSubmissionLookupHandler;
  sale_order?: PendingSubmissionLookupHandler;
};

type ResolvedReconciliationHandlers = {
  receipt: PendingSubmissionLookupHandler;
  sale: PendingSubmissionLookupHandler;
  sale_order: PendingSubmissionLookupHandler;
};

type ReconciliationDependencies = {
  storage: PendingSubmissionStorage;
  handlers?: ReconciliationHandlers;
  now?: () => string;
};

type ReconciliationItemResult = {
  submission: PendingSubmission;
  result: ReconciliationResult;
};

const defaultHandlers = {
  receipt: reconcileReceiptPendingSubmission,
  sale: reconcileSalePendingSubmission,
  sale_order: reconcileSaleOrderPendingSubmission,
};

function failureReasonFor(result: UnavailableReconciliationResult): PendingSubmissionFailureReason {
  if (result.reason === "timeout") return "timeout";
  if (result.reason === "network") return "network";
  if (result.reason === "server") return "server_unknown";
  return "unknown";
}

function isCheckable(submission: PendingSubmission): boolean {
  // `checking` may have been persisted just before an app crash. Treat it as
  // uncertain on the next pass so it can never remain stuck forever.
  return submission.status === "uncertain" || submission.status === "checking";
}

export function createPendingSubmissionReconciler({
  storage,
  handlers = {},
  now = () => new Date().toISOString(),
}: ReconciliationDependencies) {
  const lookupHandlers: ResolvedReconciliationHandlers = {
    receipt: handlers.receipt ?? defaultHandlers.receipt,
    sale: handlers.sale ?? defaultHandlers.sale,
    sale_order: handlers.sale_order ?? defaultHandlers.sale_order,
  };
  const inFlight = new Map<string, Promise<ReconciliationItemResult>>();

  function getInFlightKey(submission: PendingSubmission): string {
    return `${submission.userId}:${submission.companyId}:${submission.id}`;
  }

  async function reconcilePendingSubmission(
    submission: PendingSubmission,
  ): Promise<ReconciliationItemResult> {
    const key = getInFlightKey(submission);
    const existing = inFlight.get(key);
    if (existing) return existing;

    const work = (async (): Promise<ReconciliationItemResult> => {
      await storage.update(submission.userId, submission.companyId, submission.id, {
        status: "checking",
        lastError: null,
      });

      const result = await lookupHandlers[submission.transactionType](submission);
      const checkedAt = now();

      if (result.status === "found") {
        await storage.remove(submission.userId, submission.companyId, submission.id);
        emitPendingSubmissionResolution({
          id: submission.id,
          transactionType: submission.transactionType,
          requestId: submission.requestId,
          transactionId: result.transactionId,
          ...(result.voucherNumber ? { voucherNumber: result.voucherNumber } : {}),
          userId: submission.userId,
          companyId: submission.companyId,
        });
      } else if (result.status === "conflict") {
        await storage.update(submission.userId, submission.companyId, submission.id, {
          status: "conflict",
          lastCheckedAt: checkedAt,
          lastError: null,
        });
      } else if (result.status === "not_found") {
        await storage.update(submission.userId, submission.companyId, submission.id, {
          status: "retry_available",
          lastCheckedAt: checkedAt,
          failureReason: null,
          lastError: null,
        });
      } else {
        await storage.update(submission.userId, submission.companyId, submission.id, {
          status: "uncertain",
          lastCheckedAt: checkedAt,
          failureReason: result.status === "unavailable" ? failureReasonFor(result) : "unknown",
          lastError: result.message,
        });
      }

      return { submission, result };
    })();

    inFlight.set(key, work);
    try {
      return await work;
    } finally {
      inFlight.delete(key);
    }
  }

  async function reconcilePendingSubmissions(
    userId: string,
    companyId: string,
  ): Promise<PendingSubmissionReconciliationReport> {
    const submissions = await storage.listForUserAndCompany(userId, companyId);
    const report: PendingSubmissionReconciliationReport = {
      resolved: [],
      retryAvailable: submissions.filter((item) => item.status === "retry_available"),
      stillUncertain: [],
      conflicts: submissions.filter((item) => item.status === "conflict"),
    };

    for (const submission of submissions) {
      if (!isCheckable(submission)) continue;
      const item = await reconcilePendingSubmission(submission);

      if (item.result.status === "found") {
        report.resolved.push({
          id: item.submission.id,
          transactionType: item.submission.transactionType,
          requestId: item.submission.requestId,
          transactionId: item.result.transactionId,
          ...(item.result.voucherNumber ? { voucherNumber: item.result.voucherNumber } : {}),
        });
      } else if (item.result.status === "conflict") {
        const updated = await storage.getById(userId, companyId, item.submission.id);
        if (updated) report.conflicts.push(updated);
      } else if (item.result.status === "not_found") {
        const updated = await storage.getById(userId, companyId, item.submission.id);
        if (updated) report.retryAvailable.push(updated);
      } else {
        const updated = await storage.getById(userId, companyId, item.submission.id);
        if (updated) report.stillUncertain.push(updated);
        if (
          item.result.status === "unavailable" &&
          item.result.reason === "authentication"
        ) {
          break;
        }
      }
    }

    return report;
  }

  return { reconcilePendingSubmission, reconcilePendingSubmissions };
}

export const pendingSubmissionReconciliationService = createPendingSubmissionReconciler({
  storage: pendingSubmissionStorageService,
});
