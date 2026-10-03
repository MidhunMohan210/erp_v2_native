import type { PendingSubmission, ReconciliationResult } from "../pendingSubmission.types";
import { lookupPendingSubmission, type PendingSubmissionApiClient } from "./pendingSubmissionLookup.handler";

async function getDefaultApiClient(): Promise<PendingSubmissionApiClient> {
  // Metro resolves this static module name in the native bundle. Keeping the
  // require lazy lets standalone unit tests inject a small fake GET client.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require("../../api") as { default: PendingSubmissionApiClient };
  return module.default;
}

export async function reconcileReceiptPendingSubmission(
  submission: PendingSubmission,
  apiClient?: PendingSubmissionApiClient,
): Promise<ReconciliationResult> {
  return lookupPendingSubmission(
    apiClient ?? await getDefaultApiClient(),
    submission,
    "receipt",
    "/api/cash-transactions/by-request-id",
  );
}
