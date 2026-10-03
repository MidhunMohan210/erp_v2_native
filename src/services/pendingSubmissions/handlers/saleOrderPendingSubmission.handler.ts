import type { PendingSubmission, ReconciliationResult } from "../pendingSubmission.types";
import { lookupPendingSubmission, type PendingSubmissionApiClient } from "./pendingSubmissionLookup.handler";

async function getDefaultApiClient(): Promise<PendingSubmissionApiClient> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require("../../api") as { default: PendingSubmissionApiClient };
  return module.default;
}

export async function reconcileSaleOrderPendingSubmission(
  submission: PendingSubmission,
  apiClient?: PendingSubmissionApiClient,
): Promise<ReconciliationResult> {
  return lookupPendingSubmission(
    apiClient ?? await getDefaultApiClient(),
    submission,
    "sale_order",
    "/api/sale-orders/by-request-id",
  );
}
