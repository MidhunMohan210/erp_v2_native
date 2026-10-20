/** The voucher create endpoints that support request-ID reconciliation. */
export type PendingTransactionType = "receipt" | "sale" | "sale_order";

export type PendingSubmissionStatus =
  | "uncertain"
  | "checking"
  | "retry_available"
  | "conflict"
  // A definite 4xx rejection cannot be retried without editing the old form.
  | "rejected";

export type PendingSubmissionFailureReason =
  | "timeout"
  | "network"
  | "server_unknown"
  | "unknown";

/**
 * `payload` is deliberately unknown because each voucher type has its own
 * create request shape. It is saved exactly as it was submitted.
 */
export interface PendingSubmission {
  id: string;
  transactionType: PendingTransactionType;
  userId: string;
  companyId: string;
  requestId: string;
  payload: unknown;
  status: PendingSubmissionStatus;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  failureReason?: PendingSubmissionFailureReason;
  lastError?: string;
}

export type FoundReconciliationResult = {
  status: "found";
  transactionId: string;
  voucherNumber?: string;
};

export type ConflictReconciliationResult = {
  status: "conflict";
  transactionId: string;
  voucherNumber?: string;
};

export type UnverifiableReconciliationResult = {
  status: "unverifiable";
  message: string;
};

export type UnavailableReconciliationResult = {
  status: "unavailable";
  reason:
    | "authentication"
    | "timeout"
    | "network"
    | "server"
    | "malformed_response"
    | "unknown";
  message: string;
};

export type ReconciliationResult =
  | FoundReconciliationResult
  | ConflictReconciliationResult
  | UnverifiableReconciliationResult
  | { status: "not_found" }
  | UnavailableReconciliationResult;

export type ReconciledSubmission = {
  id: string;
  transactionType: PendingTransactionType;
  requestId: string;
  transactionId: string;
  voucherNumber?: string;
};

export type PendingSubmissionReconciliationReport = {
  resolved: ReconciledSubmission[];
  retryAvailable: PendingSubmission[];
  stillUncertain: PendingSubmission[];
  conflicts: PendingSubmission[];
};

export type PendingSubmissionLookupHandler = (
  submission: PendingSubmission,
) => Promise<ReconciliationResult>;
