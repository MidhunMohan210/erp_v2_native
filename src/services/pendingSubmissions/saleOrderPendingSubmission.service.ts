import {
  pendingSubmissionStorageService,
  type PendingSubmissionStorage,
} from "./pendingSubmissionStorage.service";
import type {
  PendingSubmission,
  PendingSubmissionStatus,
} from "./pendingSubmission.types";

const SALE_ORDER_PENDING_SUBMISSION_ID_PREFIX = "sale-order";

type SaleOrderPendingSubmissionPayload = {
  request_id?: string;
};

type SaveSaleOrderPendingSubmissionInput = {
  userId: string;
  companyId: string;
  payload: SaleOrderPendingSubmissionPayload;
  status: PendingSubmissionStatus;
};

function getSaleOrderPendingSubmissionId(requestId: string): string {
  return `${SALE_ORDER_PENDING_SUBMISSION_ID_PREFIX}:${requestId}`;
}

export async function saveSaleOrderPendingSubmission(
  input: SaveSaleOrderPendingSubmissionInput,
  storage: PendingSubmissionStorage = pendingSubmissionStorageService,
  now: () => string = () => new Date().toISOString(),
): Promise<PendingSubmission> {
  const requestId = input.payload.request_id;
  if (!requestId) {
    throw new Error("Sale Order pending submission requires a request ID");
  }

  const id = getSaleOrderPendingSubmissionId(requestId);
  const existing = await storage.getById(input.userId, input.companyId, id);
  const timestamp = now();

  // Repeated saves retain the original exact body and creation timestamp.
  const submission: PendingSubmission = {
    id,
    transactionType: "sale_order",
    userId: input.userId,
    companyId: input.companyId,
    requestId,
    payload: existing?.payload ?? input.payload,
    status: input.status,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  return storage.save(submission);
}

export async function updateSaleOrderPendingSubmissionStatus(
  userId: string,
  companyId: string,
  requestId: string,
  status: PendingSubmissionStatus,
  storage: PendingSubmissionStorage = pendingSubmissionStorageService,
): Promise<PendingSubmission | null> {
  return storage.update(
    userId,
    companyId,
    getSaleOrderPendingSubmissionId(requestId),
    { status },
  );
}

export async function removeSaleOrderPendingSubmission(
  userId: string,
  companyId: string,
  requestId: string,
  storage: PendingSubmissionStorage = pendingSubmissionStorageService,
): Promise<void> {
  await storage.remove(
    userId,
    companyId,
    getSaleOrderPendingSubmissionId(requestId),
  );
}

export { getSaleOrderPendingSubmissionId };
