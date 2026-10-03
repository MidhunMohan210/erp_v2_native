import type {
  PendingSubmission,
  PendingTransactionType,
  ReconciliationResult,
} from "../pendingSubmission.types";

export type PendingSubmissionApiClient = {
  get(url: string, config: { params: { cmp_id: string } }): Promise<{ data: unknown }>;
};

type LookupResponse = {
  success?: unknown;
  data?: {
    exists?: unknown;
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
  if (status === 401) return { status: "unavailable", reason: "authentication", message };
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

function isValidFoundResponse(
  value: LookupResponse,
  submission: PendingSubmission,
  transactionType: PendingTransactionType,
): value is Required<Pick<LookupResponse, "data">> {
  const data = value.data;
  return (
    value.success === true &&
    data?.exists === true &&
    data.transaction_type === transactionType &&
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
    const response = await apiClient.get(
      `${path}/${encodeURIComponent(submission.requestId)}`,
      { params: { cmp_id: submission.companyId } },
    );

    const responseData = response.data as LookupResponse;
    if (!isValidFoundResponse(responseData, submission, transactionType)) {
      return {
        status: "unavailable",
        reason: "malformed_response",
        message: "The request-ID lookup returned an unexpected response.",
      };
    }

    const foundData = responseData.data as { id: string; voucher_number?: unknown };
    const voucherNumber = foundData.voucher_number;
    return {
      status: "found",
      transactionId: foundData.id,
      ...(typeof voucherNumber === "string" ? { voucherNumber } : {}),
    };
  } catch (error) {
    return getUnavailableResult(error);
  }
}
