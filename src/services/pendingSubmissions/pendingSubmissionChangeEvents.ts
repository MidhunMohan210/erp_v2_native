export type PendingSubmissionChangeEvent = {
  userId: string;
  companyId: string | null;
};

type ChangeListener = (event: PendingSubmissionChangeEvent) => void;

const listeners = new Set<ChangeListener>();

export function subscribeToPendingSubmissionChanges(
  listener: ChangeListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitPendingSubmissionChange(
  event: PendingSubmissionChangeEvent,
): void {
  listeners.forEach((listener) => listener(event));
}
