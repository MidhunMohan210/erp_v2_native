import { getCurrentContextGeneration, isCurrentContextGeneration } from "@/services/authSessionGeneration";
import { store } from "@/store";

export class MasterDownloadBusyError extends Error {
  constructor() {
    super("Another offline master download is already running.");
  }
}

export class MasterDownloadCancelledError extends Error {
  constructor() {
    super("The offline master download was cancelled because the account or company changed.");
  }
}

export type MasterDownloadGuard = {
  userId: string;
  companyId: string;
  assertCurrent: () => void;
};

let activeGuard: MasterDownloadGuard | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

export function isMasterDownloadRunning(): boolean {
  return activeGuard !== null;
}

export function subscribeToMasterDownload(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reserve the single download slot before starting any network request. */
export function acquireMasterDownloadGuard(userId: string, companyId: string): MasterDownloadGuard {
  if (activeGuard) throw new MasterDownloadBusyError();
  const generation = getCurrentContextGeneration();
  const guard: MasterDownloadGuard = {
    userId,
    companyId,
    assertCurrent: () => {
      const state = store.getState();
      if (
        activeGuard !== guard ||
        !isCurrentContextGeneration(generation) ||
        state.auth.user?._id !== userId ||
        state.company.selectedCompany?._id !== companyId
      ) {
        throw new MasterDownloadCancelledError();
      }
    },
  };
  activeGuard = guard;
  try {
    guard.assertCurrent();
  } catch (error) {
    activeGuard = null;
    throw error;
  }
  notifyListeners();
  return guard;
}

export function releaseMasterDownloadGuard(guard: MasterDownloadGuard): void {
  if (activeGuard !== guard) return;
  activeGuard = null;
  notifyListeners();
}

/** T keeps the importer's metadata return type; a future Download All run can pass its guard through. */
export async function withMasterDownloadGuard<T>(
  userId: string,
  companyId: string,
  work: (guard: MasterDownloadGuard) => Promise<T>,
  existingGuard?: MasterDownloadGuard,
): Promise<T> {
  const guard = existingGuard ?? acquireMasterDownloadGuard(userId, companyId);
  const ownsGuard = existingGuard === undefined;
  try {
    if (guard.userId !== userId || guard.companyId !== companyId) {
      throw new MasterDownloadCancelledError();
    }
    guard.assertCurrent();
    return await work(guard);
  } finally {
    if (ownsGuard) releaseMasterDownloadGuard(guard);
  }
}
