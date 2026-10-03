import type { CreateReceiptRequest } from "../../types/receipt";

import {
  pendingSubmissionStorageService,
  type PendingSubmissionStorage,
} from "./pendingSubmissionStorage.service";
import type {
  PendingSubmission,
  PendingSubmissionStatus,
} from "./pendingSubmission.types";

const RECEIPT_PENDING_SUBMISSION_ID_PREFIX = "receipt";

type SaveReceiptPendingSubmissionInput = {
  userId: string;
  companyId: string;
  payload: CreateReceiptRequest;
  status: PendingSubmissionStatus;
};

function getReceiptPendingSubmissionId(requestId: string): string {
  return `${RECEIPT_PENDING_SUBMISSION_ID_PREFIX}:${requestId}`;
}

export async function saveReceiptPendingSubmission(
  input: SaveReceiptPendingSubmissionInput,
  storage: PendingSubmissionStorage = pendingSubmissionStorageService,
  now: () => string = () => new Date().toISOString(),
): Promise<PendingSubmission> {
  const id = getReceiptPendingSubmissionId(input.payload.request_id);
  const existing = await storage.getById(input.userId, input.companyId, id);
  const timestamp = now();

  // Preserve the first timestamp and exact original body when a user retries.
  const submission: PendingSubmission = {
    id,
    transactionType: "receipt",
    userId: input.userId,
    companyId: input.companyId,
    requestId: input.payload.request_id,
    payload: existing?.payload ?? input.payload,
    status: input.status,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  return storage.save(submission);
}

export async function updateReceiptPendingSubmissionStatus(
  userId: string,
  companyId: string,
  requestId: string,
  status: PendingSubmissionStatus,
  storage: PendingSubmissionStorage = pendingSubmissionStorageService,
): Promise<PendingSubmission | null> {
  return storage.update(
    userId,
    companyId,
    getReceiptPendingSubmissionId(requestId),
    { status },
  );
}

export async function removeReceiptPendingSubmission(
  userId: string,
  companyId: string,
  requestId: string,
  storage: PendingSubmissionStorage = pendingSubmissionStorageService,
): Promise<void> {
  await storage.remove(
    userId,
    companyId,
    getReceiptPendingSubmissionId(requestId),
  );
}

export { getReceiptPendingSubmissionId };
