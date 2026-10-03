import type { PendingSubmissionReconciliationReport } from "./pendingSubmission.types";

export type PendingSubmissionReconciliationContext = {
  userId: string | null;
  companyId: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isCompanyLoading: boolean;
};

export type PendingSubmissionAppState =
  | "active"
  | "background"
  | "inactive"
  | "unknown";

type ReconcilePendingSubmissions = (
  userId: string,
  companyId: string,
) => Promise<PendingSubmissionReconciliationReport>;

type CoordinatorDependencies = {
  reconcilePendingSubmissions: ReconcilePendingSubmissions;
  onReport?: (
    report: PendingSubmissionReconciliationReport,
    context: PendingSubmissionReconciliationContext,
  ) => Promise<void> | void;
  initialAppState?: PendingSubmissionAppState;
};

export type PendingSubmissionReconciliationCoordinator = {
  setContext(context: PendingSubmissionReconciliationContext): Promise<void>;
  setOnline(isOnline: boolean): Promise<void>;
  handleAppStateChange(appState: PendingSubmissionAppState): Promise<void>;
};

function isContextReady(context: PendingSubmissionReconciliationContext): boolean {
  return Boolean(
    context.isAuthenticated &&
      !context.isAuthLoading &&
      !context.isCompanyLoading &&
      context.userId &&
      context.companyId,
  );
}

function isScopeChanged(
  previous: PendingSubmissionReconciliationContext,
  next: PendingSubmissionReconciliationContext,
): boolean {
  return previous.userId !== next.userId || previous.companyId !== next.companyId;
}

export function createPendingSubmissionReconciliationCoordinator({
  reconcilePendingSubmissions,
  onReport,
  initialAppState = "unknown",
}: CoordinatorDependencies): PendingSubmissionReconciliationCoordinator {
  let context: PendingSubmissionReconciliationContext = {
    userId: null,
    companyId: null,
    isAuthenticated: false,
    isAuthLoading: true,
    isCompanyLoading: true,
  };
  let isOnline = false;
  let appState = initialAppState;
  const activeRuns = new Map<string, Promise<void>>();

  async function reconcileIfReady(): Promise<void> {
    const userId = context.userId;
    const companyId = context.companyId;
    if (!isOnline || !isContextReady(context) || !userId || !companyId) return;
    const scopeKey = `${userId}:${companyId}`;
    const existingRun = activeRuns.get(scopeKey);
    if (existingRun) return existingRun;

    const activeContext = context;
    const run = (async () => {
      try {
        const report = await reconcilePendingSubmissions(
          userId,
          companyId,
        );
        await onReport?.(report, activeContext);
      } catch {
        // The reconciliation service normally turns lookup failures into an
        // unresolved result. This protects the root from unexpected storage errors.
      }
    })();

    activeRuns.set(scopeKey, run);
    try {
      await run;
    } finally {
      if (activeRuns.get(scopeKey) === run) activeRuns.delete(scopeKey);
    }
  }

  return {
    async setContext(nextContext: PendingSubmissionReconciliationContext): Promise<void> {
      const wasReady = isContextReady(context);
      const changedScope = isScopeChanged(context, nextContext);
      context = nextContext;

      if (changedScope || (!wasReady && isContextReady(context))) {
        await reconcileIfReady();
      }
    },

    async setOnline(nextIsOnline: boolean): Promise<void> {
      const wasOnline = isOnline;
      isOnline = nextIsOnline;
      if (!wasOnline && isOnline) await reconcileIfReady();
    },

    async handleAppStateChange(nextAppState: PendingSubmissionAppState): Promise<void> {
      const returnedToForeground =
        (appState === "background" || appState === "inactive") &&
        nextAppState === "active";
      appState = nextAppState;
      if (returnedToForeground) await reconcileIfReady();
    },
  };
}
