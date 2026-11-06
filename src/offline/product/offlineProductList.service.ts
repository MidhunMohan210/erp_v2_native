import { withOfflineDatabase } from "@/offline/database/database";

import {
  listOfflineProducts,
  type OfflineProduct,
} from "./productMasterRepository";

export async function getSavedOfflineProducts(
  userId: string,
  companyId: string,
  search: string,
): Promise<OfflineProduct[]> {
  if (!userId.trim() || !companyId.trim()) {
    throw new Error("Sign in and select a company before viewing offline Products.");
  }

  // The repository applies both the company boundary and local name search.
  return withOfflineDatabase(userId, (database) =>
    listOfflineProducts(database, companyId, { search }),
  );
}
