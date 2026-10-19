import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateTodayTransactions } from "@/hooks/queries/voucherQueries";
import {
  createPendingSubmissionReconciliationCoordinator,
  type PendingSubmissionAppState,
  type PendingSubmissionReconciliationCoordinator as PendingSubmissionCoordinator,
} from "@/services/pendingSubmissions/pendingSubmissionReconciliationCoordinator";
import { pendingSubmissionReconciliationService } from "@/services/pendingSubmissions/pendingSubmissionReconciliation.service";
import { migrateLegacyReceiptRecovery } from "@/services/pendingSubmissions/legacyReceiptRecoveryMigration.service";
import type {
  PendingSubmissionReconciliationReport,
} from "@/services/pendingSubmissions/pendingSubmission.types";
import { useAppSelector } from "@/store/hooks";
import { store } from "@/store";
import { getCurrentContextGeneration } from "@/services/authSessionGeneration";
import { isCurrentVoucherOperationContext } from "@/services/voucherOperationContext";

function isOnline(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

function toPendingSubmissionAppState(state: AppStateStatus): PendingSubmissionAppState {
  if (state === "active" || state === "background" || state === "inactive") {
    return state;
  }
  return "unknown";
}

function invalidateResolvedQueries(
  report: PendingSubmissionReconciliationReport,
  companyId: string,
  invalidate: (queryKey: readonly string[]) => Promise<void>,
): void {
  const resolvedTypes = report.resolved.map((item) => item.transactionType);
  const invalidations: Promise<void>[] = [];

  if (resolvedTypes.includes("receipt")) {
    invalidations.push(invalidate(QUERY_KEYS.receipts));
  }
  if (resolvedTypes.includes("sale")) {
    invalidations.push(invalidate(["sales"]));
  }
  if (resolvedTypes.includes("sale_order")) {
    invalidations.push(invalidate(QUERY_KEYS.saleOrders));
  }
  // A reconciled Sale or Receipt changes the party balance just like a
  // foreground submission, so the Outstanding party list must become stale.
  if (resolvedTypes.includes("receipt") || resolvedTypes.includes("sale")) {
    invalidations.push(invalidate(QUERY_KEYS.parties));
    invalidations.push(invalidate(QUERY_KEYS.outstanding));
  }
  if (resolvedTypes.length > 0) {
    invalidations.push(invalidate(["daybook", companyId]));
  }

  void Promise.all(invalidations);
}

/** Mount once under the app providers so reconciliation is independent of screens. */
export function PendingSubmissionReconciliationCoordinator() {
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => state.auth.user?._id ?? null);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading);
  const companyId = useAppSelector((state) => state.company.selectedCompany?._id ?? null);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const coordinatorRef = useRef<PendingSubmissionCoordinator | null>(null);

  if (!coordinatorRef.current) {
    coordinatorRef.current = createPendingSubmissionReconciliationCoordinator({
      reconcilePendingSubmissions:
        async (activeUserId, activeCompanyId) => {
          try {
            await migrateLegacyReceiptRecovery(activeUserId, activeCompanyId);
          } catch {
            // A legacy-key read failure must not block reconciliation of
            // submissions that are already safely in shared storage.
          }
          return pendingSubmissionReconciliationService.reconcilePendingSubmissions(
            activeUserId,
            activeCompanyId,
          );
        },
      onReport: (report, activeContext) => {
        if (!activeContext.companyId) return;
        const currentState = store.getState();
        if (!isCurrentVoucherOperationContext(
          {
            userId: activeContext.userId ?? "",
            companyId: activeContext.companyId,
            contextGeneration: activeContext.contextGeneration,
          },
          currentState.auth.user?._id,
          currentState.company.selectedCompany?._id,
        )) {
          return;
        }
        invalidateResolvedQueries(report, activeContext.companyId, (queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        );
        if (report.resolved.length > 0) {
          void invalidateTodayTransactions(queryClient, activeContext.companyId);
        }
      },
      initialAppState: toPendingSubmissionAppState(AppState.currentState),
    });
  }

  useEffect(() => {
    void coordinatorRef.current?.setContext({
      userId,
      companyId,
      contextGeneration: getCurrentContextGeneration(),
      isAuthenticated,
      isAuthLoading,
      isCompanyLoading,
    });
  }, [companyId, isAuthenticated, isAuthLoading, isCompanyLoading, userId]);

  useEffect(() => {
    void NetInfo.fetch().then((state) => {
      void coordinatorRef.current?.setOnline(isOnline(state));
    });

    return NetInfo.addEventListener((state) => {
      void coordinatorRef.current?.setOnline(isOnline(state));
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      void coordinatorRef.current?.handleAppStateChange(
        toPendingSubmissionAppState(nextState),
      );
    });
    return () => subscription.remove();
  }, []);

  return null;
}
