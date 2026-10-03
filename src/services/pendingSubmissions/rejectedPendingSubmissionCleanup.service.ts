import type { PendingSubmission } from "./pendingSubmission.types";
import type { PendingSubmissionStorage } from "./pendingSubmissionStorage.service";

export type FreshCreateRoute =
  | "/receipt-create"
  | "/sale-create"
  | "/sale-order-create";

type RejectedCleanupDependencies = {
  storage: Pick<PendingSubmissionStorage, "remove">;
  resetDraft: (transactionType: PendingSubmission["transactionType"]) => void;
  navigate: (route: FreshCreateRoute) => void;
};

export function getFreshCreateRoute(
  transactionType: PendingSubmission["transactionType"],
): FreshCreateRoute {
  if (transactionType === "sale") return "/sale-create";
  if (transactionType === "sale_order") return "/sale-order-create";
  return "/receipt-create";
}

export async function dismissRejectedPendingSubmission(
  submission: PendingSubmission,
  storage: Pick<PendingSubmissionStorage, "remove">,
): Promise<boolean> {
  if (submission.status !== "rejected") return false;

  // A rejected request was definitively refused, so local cleanup needs no API call.
  await storage.remove(submission.userId, submission.companyId, submission.id);
  return true;
}

export async function createNewFromRejectedPendingSubmission(
  submission: PendingSubmission,
  dependencies: RejectedCleanupDependencies,
): Promise<boolean> {
  const wasRemoved = await dismissRejectedPendingSubmission(
    submission,
    dependencies.storage,
  );
  if (!wasRemoved) return false;

  // Clear the frozen body before navigation; each Create screen makes a new request ID.
  dependencies.resetDraft(submission.transactionType);
  dependencies.navigate(getFreshCreateRoute(submission.transactionType));
  return true;
}
