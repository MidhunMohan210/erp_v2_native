import { isAxiosError } from "axios";

import type { TallyRef } from "../types/voucher";

export const TALLY_ACCEPTED_MESSAGE =
  "This transaction has already been accepted by Tally and cannot be edited or cancelled.";
export const TALLY_UNVERIFIED_MESSAGE =
  "Tally acknowledgement status is unavailable. Refresh the transaction before editing or cancelling.";

export type TallyModificationState = "allowed" | "accepted" | "unverified";

export function getTallyModificationState(
  tallyRef: TallyRef | null | undefined,
  businessStatusAllowsModification: boolean,
): TallyModificationState {
  if (tallyRef?.tally_status === "accepted") return "accepted";
  if (tallyRef?.tally_status !== "pending") return "unverified";
  return businessStatusAllowsModification ? "allowed" : "unverified";
}

export function getTallyModificationMessage(state: TallyModificationState): string {
  if (state === "accepted") return TALLY_ACCEPTED_MESSAGE;
  return TALLY_UNVERIFIED_MESSAGE;
}

type BackendErrorBody = {
  message?: unknown;
  code?: unknown;
  error?: { message?: unknown; code?: unknown };
};

export function getBackendErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<BackendErrorBody>(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const data = error.response?.data;
  const message = data?.message ?? data?.error?.message;
  return typeof message === "string" && message.trim() ? message : error.message || fallback;
}

// A 409 alone can be an allocation or business conflict. Require the backend's
// explicit Tally/accepted message or code before applying this protection flow.
export function isTallyAcceptedConflict(error: unknown): boolean {
  if (!isAxiosError<BackendErrorBody>(error) || error.response?.status !== 409) {
    return false;
  }

  const data = error.response.data;
  const code = String(data?.code ?? data?.error?.code ?? "").toLowerCase();
  const message = String(data?.message ?? data?.error?.message ?? "").toLowerCase();
  return (
    (code.includes("tally") && code.includes("accept")) ||
    (message.includes("tally") && message.includes("accept"))
  );
}
