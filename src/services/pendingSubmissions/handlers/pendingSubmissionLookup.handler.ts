import type {
  PendingSubmission,
  PendingTransactionType,
  ReconciliationResult,
} from "../pendingSubmission.types";

export type PendingSubmissionApiClient = {
  post(
    url: string,
    data: { payload: unknown },
    config: { params: { cmp_id: string } },
  ): Promise<{ data: unknown }>;
};

type LookupResponse = {
  success?: unknown;
  data?: {
    outcome?: unknown;
    transaction_type?: unknown;
    request_id?: unknown;
    id?: unknown;
    voucher_number?: unknown;
  };
};

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === "number" ? response.status : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "The request-ID lookup could not be completed.";
}

function getUnavailableResult(error: unknown): ReconciliationResult {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error);
  if (status === 401 || status === 403) {
    return { status: "unavailable", reason: "authentication", message };
  }
  if (status === 404) return { status: "not_found" };
  if (status && status >= 500) return { status: "unavailable", reason: "server", message };

  const code = error && typeof error === "object"
    ? (error as { code?: unknown }).code
    : undefined;
  if (code === "ECONNABORTED" || /timeout/i.test(message)) {
    return { status: "unavailable", reason: "timeout", message };
  }
  if (!status) return { status: "unavailable", reason: "network", message };
  return { status: "unavailable", reason: "unknown", message };
}

function hasMatchingTransactionIdentity(
  value: LookupResponse,
  submission: PendingSubmission,
  transactionType: PendingTransactionType,
): boolean {
  const data = value.data;
  return (
    value.success === true &&
    data?.transaction_type === transactionType &&
    data.request_id === submission.requestId &&
    typeof data.id === "string" &&
    data.id.length > 0
  );
}

export async function lookupPendingSubmission(
  apiClient: PendingSubmissionApiClient,
  submission: PendingSubmission,
  transactionType: PendingTransactionType,
  path: string,
): Promise<ReconciliationResult> {
  try {
    const response = await apiClient.post(
      `${path}/${encodeURIComponent(submission.requestId)}/verify`,
      { payload: submission.payload },
      { params: { cmp_id: submission.companyId } },
    );

    const responseData = response.data as LookupResponse;
    const outcome = responseData.data?.outcome;
    if (outcome === "not_found" && responseData.success === true) {
      return { status: "not_found" };
    }
    if (outcome === "unverifiable" && responseData.success === true) {
      return {
        status: "unverifiable",
        message: "The saved voucher cannot be safely verified.",
      };
    }
    if (!hasMatchingTransactionIdentity(responseData, submission, transactionType)) {
      return {
        status: "unavailable",
        reason: "malformed_response",
        message: "The request-ID lookup returned an unexpected response.",
      };
    }

    const foundData = responseData.data as { id: string; voucher_number?: unknown };
    const voucherNumber = foundData.voucher_number;
    if (outcome === "match") {
      return {
        status: "found",
        transactionId: foundData.id,
        ...(typeof voucherNumber === "string" ? { voucherNumber } : {}),
      };
    }
    if (outcome === "conflict") {
      // Existing conflict rows use this same lookup to open the server voucher.
      if (submission.status === "conflict") {
        return {
          status: "found",
          transactionId: foundData.id,
          ...(typeof voucherNumber === "string" ? { voucherNumber } : {}),
        };
      }
      return {
        status: "conflict",
        transactionId: foundData.id,
        ...(typeof voucherNumber === "string" ? { voucherNumber } : {}),
      };
    }
    return {
      status: "unavailable",
      reason: "malformed_response",
      message: "The request-ID verification returned an unexpected outcome.",
    };
  } catch (error) {
    return getUnavailableResult(error);
  }
}
