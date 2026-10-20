import { reconcileReceiptPendingSubmission } from "./handlers/receiptPendingSubmission.handler";
import { reconcileSalePendingSubmission } from "./handlers/salePendingSubmission.handler";
import { reconcileSaleOrderPendingSubmission } from "./handlers/saleOrderPendingSubmission.handler";
import type {
  PendingSubmission,
  ReconciliationResult,
} from "./pendingSubmission.types";
import type { PendingSubmissionStorage } from "./pendingSubmissionStorage.service";

export type ExistingTransactionRoute =
  | "/receipt-detail"
  | "/sale-detail"
  | "/sale-order-detail";

type ConflictLookupDependencies = {
  lookupReceipt: (submission: PendingSubmission) => Promise<ReconciliationResult>;
  lookupSale: (submission: PendingSubmission) => Promise<ReconciliationResult>;
  lookupSaleOrder: (submission: PendingSubmission) => Promise<ReconciliationResult>;
};

const defaultLookupDependencies: ConflictLookupDependencies = {
  lookupReceipt: reconcileReceiptPendingSubmission,
  lookupSale: reconcileSalePendingSubmission,
  lookupSaleOrder: reconcileSaleOrderPendingSubmission,
};

export function getExistingTransactionRoute(
  transactionType: PendingSubmission["transactionType"],
): ExistingTransactionRoute {
  if (transactionType === "sale") return "/sale-detail";
  if (transactionType === "sale_order") return "/sale-order-detail";
  return "/receipt-detail";
}

export async function viewExistingConflictSubmission(
  submission: PendingSubmission,
  dependencies: ConflictLookupDependencies = defaultLookupDependencies,
): Promise<ReconciliationResult | null> {
  if (submission.status !== "conflict") return null;

  // This calls only the scoped read-only verification endpoint. It never
  // reconciles, creates, or removes the record.
  if (submission.transactionType === "receipt") {
    return dependencies.lookupReceipt(submission);
  }
  if (submission.transactionType === "sale") {
    return dependencies.lookupSale(submission);
  }
  return dependencies.lookupSaleOrder(submission);
}

export async function dismissConflictPendingSubmission(
  submission: PendingSubmission,
  storage: Pick<PendingSubmissionStorage, "remove">,
): Promise<boolean> {
  if (submission.status !== "conflict") return false;

  // A conflict is local recovery metadata; this never touches the real backend voucher.
  await storage.remove(submission.userId, submission.companyId, submission.id);
  return true;
}
