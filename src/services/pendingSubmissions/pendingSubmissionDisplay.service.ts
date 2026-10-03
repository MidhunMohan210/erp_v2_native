import type { PendingSubmission } from "./pendingSubmission.types";

export type PendingSubmissionDisplayData = {
  title: "Receipt" | "Sale" | "Sale Order";
  partyName: string;
  partyId?: string;
  amount: number | null;
  transactionDate: string | null;
};

function getText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function getReceiptPendingDisplayData(
  submission: PendingSubmission,
): PendingSubmissionDisplayData {
  const payload = getRecord(submission.payload);
  return {
    title: "Receipt",
    partyName: getText(payload.party_name) ?? "Customer unavailable",
    amount: getNumber(payload.amount),
    transactionDate: getText(payload.date),
  };
}

export function getSalePendingDisplayData(
  submission: PendingSubmission,
): PendingSubmissionDisplayData {
  const payload = getRecord(submission.payload);
  const partyId = getText(payload.partyId);
  // Sale Create intentionally persists partyId rather than a mutable party name.
  return {
    title: "Sale",
    partyName: "Customer unavailable",
    ...(partyId ? { partyId } : {}),
    amount: null,
    transactionDate: getText(payload.transactionDate),
  };
}

export function getSaleOrderPendingDisplayData(
  submission: PendingSubmission,
): PendingSubmissionDisplayData {
  const payload = getRecord(submission.payload);
  const party = getRecord(payload.party);
  return {
    title: "Sale Order",
    partyName: getText(party.partyName) ?? "Customer unavailable",
    amount: getNumber(payload.finalAmount),
    transactionDate: getText(payload.transactionDate),
  };
}

export function getPendingSubmissionDisplayData(
  submission: PendingSubmission,
): PendingSubmissionDisplayData {
  if (submission.transactionType === "receipt") {
    return getReceiptPendingDisplayData(submission);
  }
  if (submission.transactionType === "sale") {
    return getSalePendingDisplayData(submission);
  }
  return getSaleOrderPendingDisplayData(submission);
}
