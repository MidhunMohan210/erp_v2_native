import type {
  CreateReceiptRequest,
  ReceiptSubmissionRecovery,
} from "../types/receipt";

const RECEIPT_RECOVERY_KEY_PREFIX = "receipt-submission-recovery-v1";

export function getReceiptRecoveryStorageKey(
  userId: string,
  companyId: string,
): string {
  return `${RECEIPT_RECOVERY_KEY_PREFIX}:${userId}:${companyId}`;
}

function isCreateReceiptRequest(value: unknown): value is CreateReceiptRequest {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<CreateReceiptRequest>;
  const hasValidInstrument =
    payload.instrument_type === "cash" ||
    payload.instrument_type === "cheque" ||
    payload.instrument_type === "upi" ||
    payload.instrument_type === "neft" ||
    payload.instrument_type === "rtgs";
  const hasValidSettlements =
    Array.isArray(payload.settlement_details) &&
    payload.settlement_details.every(
      (row) =>
        Boolean(row) &&
        typeof row.outstanding === "string" &&
        row.outstanding.length > 0 &&
        typeof row.settled_amount === "number" &&
        Number.isFinite(row.settled_amount) &&
        row.settled_amount > 0,
    );

  return (
    typeof payload.cmp_id === "string" &&
    payload.cmp_id.length > 0 &&
    typeof payload.request_id === "string" &&
    payload.request_id.length > 0 &&
    payload.voucher_type === "receipt" &&
    typeof payload.series_id === "string" &&
    typeof payload.date === "string" &&
    typeof payload.party_id === "string" &&
    typeof payload.party_name === "string" &&
    typeof payload.cash_bank_id === "string" &&
    typeof payload.cash_bank_name === "string" &&
    (payload.cash_bank_type === "cash" || payload.cash_bank_type === "bank") &&
    hasValidInstrument &&
    typeof payload.amount === "number" &&
    Number.isFinite(payload.amount) &&
    payload.amount > 0 &&
    hasValidSettlements &&
    (payload.narration === null || typeof payload.narration === "string") &&
    (payload.cheque_number === null ||
      typeof payload.cheque_number === "string") &&
    (payload.cheque_date === null || typeof payload.cheque_date === "string")
  );
}

export function areReceiptRecoveryPayloadsEqual(
  first: CreateReceiptRequest,
  second: CreateReceiptRequest,
): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function parseReceiptSubmissionRecovery(
  storedValue: string | null,
  expectedUserId: string,
  expectedCompanyId: string,
): ReceiptSubmissionRecovery | null {
  if (!storedValue) return null;

  try {
    const value = JSON.parse(storedValue) as Partial<ReceiptSubmissionRecovery>;
    const hasValidState =
      value.state === "submitting" ||
      value.state === "uncertain" ||
      value.state === "conflict";

    if (
      value.version !== 1 ||
      value.userId !== expectedUserId ||
      value.companyId !== expectedCompanyId ||
      typeof value.seriesName !== "string" ||
      typeof value.savedAt !== "string" ||
      !hasValidState ||
      !isCreateReceiptRequest(value.payload) ||
      value.payload.cmp_id !== expectedCompanyId
    ) {
      return null;
    }

    return value as ReceiptSubmissionRecovery;
  } catch {
    return null;
  }
}
