import { withOfflineDatabase } from "@/offline/database/database";

import {
  readSavedParties,
  type SavedOfflineParty,
} from "./partyMasterRepository";

export async function getSavedOfflineParties(
  userId: string,
  companyId: string,
  search: string,
): Promise<SavedOfflineParty[]> {
  if (!userId.trim() || !companyId.trim()) {
    throw new Error("Sign in and select a company before viewing offline Parties.");
  }

  // Database access is user-scoped; the repository applies company and search filters.
  return withOfflineDatabase(userId, (database) =>
    readSavedParties(database, companyId, search),
  );
}
