import { isAxiosError } from "axios";

import { pendingSubmissionReconciliationService } from "./pendingSubmissionReconciliation.service";
import {
  pendingSubmissionStorageService,
  type PendingSubmissionStorage,
} from "./pendingSubmissionStorage.service";
import type {
  PendingSubmission,
  ReconciliationResult,
} from "./pendingSubmission.types";

type CreateResponse = {
  idempotent_replay?: boolean;
};

type RetryResult =
  | { status: "success"; wasReplay: boolean }
  | { status: "uncertain" }
  | { status: "conflict" }
  | { status: "rejected"; message: string };

type RetryDependencies = {
  storage: PendingSubmissionStorage;
  postReceipt: (payload: unknown) => Promise<CreateResponse>;
  postSale: (payload: unknown, companyId: string) => Promise<CreateResponse>;
  postSaleOrder: (payload: unknown) => Promise<CreateResponse>;
  reconcile: (submission: PendingSubmission) => Promise<{
    result: ReconciliationResult;
  }>;
};

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : "The submission was rejected.";
}

function getErrorStatus(error: unknown): number | undefined {
  if (isAxiosError(error)) return error.response?.status;
  if (!error || typeof error !== "object") return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === "number" ? response.status : undefined;
}

export function createPendingSubmissionRetryDispatcher(
  dependencies: RetryDependencies,
) {
  const inFlight = new Map<string, Promise<RetryResult>>();

  async function postSubmission(submission: PendingSubmission): Promise<CreateResponse> {
    if (submission.transactionType === "receipt") {
      return dependencies.postReceipt(submission.payload);
    }
    if (submission.transactionType === "sale") {
      return dependencies.postSale(submission.payload, submission.companyId);
    }
    return dependencies.postSaleOrder(submission.payload);
  }

  async function retry(submission: PendingSubmission): Promise<RetryResult> {
    const existing = inFlight.get(submission.id);
    if (existing) return existing;

    const work = (async (): Promise<RetryResult> => {
      await dependencies.storage.update(
        submission.userId,
        submission.companyId,
        submission.id,
        { status: "uncertain" },
      );

      try {
        const response = await postSubmission(submission);
        await dependencies.storage.remove(
          submission.userId,
          submission.companyId,
          submission.id,
        );
        return { status: "success", wasReplay: Boolean(response.idempotent_replay) };
      } catch (error) {
        const status = getErrorStatus(error);
        if (status === 409) {
          await dependencies.storage.update(
            submission.userId,
            submission.companyId,
            submission.id,
            { status: "conflict" },
          );
          return { status: "conflict" };
        }

        const isDefinitiveClientFailure =
          status !== undefined && status >= 400 && status < 500 && status !== 408;
        if (isDefinitiveClientFailure) {
          // No editable Create form is open here, so preserve the record for
          // later attention instead of silently deleting accounting intent.
          await dependencies.storage.update(
            submission.userId,
            submission.companyId,
            submission.id,
            { status: "rejected", lastError: getErrorMessage(error) },
          );
          return { status: "rejected", message: getErrorMessage(error) };
        }

        await dependencies.storage.update(
          submission.userId,
          submission.companyId,
          submission.id,
          { status: "uncertain" },
        );
        return { status: "uncertain" };
      }
    })();

    inFlight.set(submission.id, work);
    try {
      return await work;
    } finally {
      if (inFlight.get(submission.id) === work) inFlight.delete(submission.id);
    }
  }

  async function checkStatus(submission: PendingSubmission): Promise<ReconciliationResult> {
    const result = await dependencies.reconcile(submission);
    return result.result;
  }

  return { retry, checkStatus };
}

function getDefaultRetryDependencies(): RetryDependencies {
  // These require calls are delayed so focused storage tests can inject simple
  // API fakes without loading app-only service dependencies.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const receiptModule = require("../../services/cashTransaction.service") as {
    cashTransactionService: { createReceipt: (payload: unknown) => Promise<CreateResponse> };
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const saleModule = require("../../services/sale.service") as {
    saleService: { createSale: (payload: unknown, companyId: string) => Promise<CreateResponse> };
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const saleOrderModule = require("../../services/saleOrder.service") as {
    saleOrderService: { createSaleOrder: (payload: unknown) => Promise<CreateResponse> };
  };

  return {
    storage: pendingSubmissionStorageService,
    postReceipt: receiptModule.cashTransactionService.createReceipt,
    postSale: saleModule.saleService.createSale,
    postSaleOrder: saleOrderModule.saleOrderService.createSaleOrder,
    reconcile: (submission) =>
      pendingSubmissionReconciliationService.reconcilePendingSubmission(submission),
  };
}

let defaultDispatcher: ReturnType<typeof createPendingSubmissionRetryDispatcher> | null = null;

function getDefaultDispatcher() {
  if (!defaultDispatcher) {
    defaultDispatcher = createPendingSubmissionRetryDispatcher(
      getDefaultRetryDependencies(),
    );
  }
  return defaultDispatcher;
}

export const pendingSubmissionRetryService = {
  retry: (submission: PendingSubmission) => getDefaultDispatcher().retry(submission),
  checkStatus: (submission: PendingSubmission) =>
    getDefaultDispatcher().checkStatus(submission),
};

export type { RetryResult };
