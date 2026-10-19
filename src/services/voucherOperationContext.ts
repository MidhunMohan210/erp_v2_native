import {
  getCurrentContextGeneration,
  isCurrentContextGeneration,
} from "./authSessionGeneration";

export type VoucherOperationContext = {
  userId: string;
  companyId: string;
  contextGeneration: number;
};

export function createVoucherOperationContext(
  userId: string,
  companyId: string,
): VoucherOperationContext {
  return {
    userId,
    companyId,
    contextGeneration: getCurrentContextGeneration(),
  };
}

/**
 * Returns false after logout, account replacement, or a company switch.
 * Callers use it after awaits before changing Redux, navigation, or UI.
 */
export function isCurrentVoucherOperationContext(
  context: VoucherOperationContext,
  activeUserId: string | undefined,
  activeCompanyId: string | undefined,
): boolean {
  return (
    context.userId === activeUserId &&
    context.companyId === activeCompanyId &&
    isCurrentContextGeneration(context.contextGeneration)
  );
}
