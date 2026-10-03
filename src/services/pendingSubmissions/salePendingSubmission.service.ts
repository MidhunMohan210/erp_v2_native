import {
  pendingSubmissionStorageService,
  type PendingSubmissionStorage,
} from "./pendingSubmissionStorage.service";
import type {
  PendingSubmission,
  PendingSubmissionStatus,
} from "./pendingSubmission.types";

const SALE_PENDING_SUBMISSION_ID_PREFIX = "sale";

// Storage only needs the idempotency key. The full object is kept unchanged as
// `PendingSubmission.payload` and is typed as CreateSalePayload by the screen.
type SalePendingSubmissionPayload = {
  request_id: string;
};

type SaveSalePendingSubmissionInput = {
  userId: string;
  companyId: string;
  payload: SalePendingSubmissionPayload;
  status: PendingSubmissionStatus;
};

function getSalePendingSubmissionId(requestId: string): string {
  return `${SALE_PENDING_SUBMISSION_ID_PREFIX}:${requestId}`;
}

export async function saveSalePendingSubmission(
  input: SaveSalePendingSubmissionInput,
  storage: PendingSubmissionStorage = pendingSubmissionStorageService,
  now: () => string = () => new Date().toISOString(),
): Promise<PendingSubmission> {
  const id = getSalePendingSubmissionId(input.payload.request_id);
  const existing = await storage.getById(input.userId, input.companyId, id);
  const timestamp = now();

  // Retrying must preserve the first exact POST body and its original time.
  const submission: PendingSubmission = {
    id,
    transactionType: "sale",
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

export async function updateSalePendingSubmissionStatus(
  userId: string,
  companyId: string,
  requestId: string,
  status: PendingSubmissionStatus,
  storage: PendingSubmissionStorage = pendingSubmissionStorageService,
): Promise<PendingSubmission | null> {
  return storage.update(userId, companyId, getSalePendingSubmissionId(requestId), {
    status,
  });
}

export async function removeSalePendingSubmission(
  userId: string,
  companyId: string,
  requestId: string,
  storage: PendingSubmissionStorage = pendingSubmissionStorageService,
): Promise<void> {
  await storage.remove(userId, companyId, getSalePendingSubmissionId(requestId));
}

export { getSalePendingSubmissionId };
