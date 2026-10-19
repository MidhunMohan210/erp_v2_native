import { isCurrentAuthGeneration } from "./authSessionGeneration";
import type { Company, CompanySummary } from "../types/company";

// Kept only so logout can remove the old device-wide value during the upgrade.
export const LEGACY_SELECTED_COMPANY_KEY = "selectedCompany";

const USER_SELECTED_COMPANY_KEY_PREFIX = "selectedCompany:v2:user";

export type CompanyRestoreContext = {
  userId: string;
  authGeneration: number;
};

export function getSelectedCompanyStorageKey(userId: string): string {
  return `${USER_SELECTED_COMPANY_KEY_PREFIX}:${encodeURIComponent(userId)}`;
}

export function isCurrentCompanyRestoreContext(
  context: CompanyRestoreContext,
  activeUserId: string | undefined,
): boolean {
  return (
    context.userId === activeUserId &&
    isCurrentAuthGeneration(context.authGeneration)
  );
}

/**
 * The company list is the existing backend access check. Returning the current
 * server record refreshes the saved summary and prevents stale access from
 * being restored.
 */
export function getAuthorizedSavedCompany(
  savedValue: string | null,
  accessibleCompanies: Company[],
): CompanySummary | null {
  if (!savedValue) return null;

  try {
    const savedCompany = JSON.parse(savedValue) as { _id?: unknown };
    if (typeof savedCompany._id !== "string") return null;

    return (
      accessibleCompanies.find((company) => company._id === savedCompany._id) ??
      null
    );
  } catch {
    return null;
  }
}
