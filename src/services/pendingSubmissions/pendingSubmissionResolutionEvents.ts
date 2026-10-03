import type { ReconciledSubmission } from "./pendingSubmission.types";

export type PendingSubmissionResolutionEvent = ReconciledSubmission & {
  userId: string;
  companyId: string;
};

type ResolutionListener = (event: PendingSubmissionResolutionEvent) => void;

const listeners = new Set<ResolutionListener>();

export function subscribeToPendingSubmissionResolution(
  listener: ResolutionListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitPendingSubmissionResolution(
  event: PendingSubmissionResolutionEvent,
): void {
  listeners.forEach((listener) => listener(event));
}
