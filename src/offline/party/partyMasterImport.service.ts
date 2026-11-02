import { withOfflineDatabase } from "@/offline/database/database";
import { downloadPartyMaster } from "@/services/partyMasterDownload.service";

import {
  readSavedParties,
  replaceDownloadedParties,
  type OfflineParty,
  type SavedOfflineParty,
} from "./partyMasterRepository";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Validate the complete download before starting its SQLite transaction. */
export function validateDownloadedParties(
  parties: OfflineParty[],
  cmpId: string,
): void {
  const ids = new Set<string>();
  for (const party of parties) {
    if (
      !isNonEmptyString(party._id) ||
      party.cmp_id !== cmpId ||
      !isNonEmptyString(party.partyName)
    ) {
      throw new Error("The Party master download contains an invalid Party.");
    }
    if (ids.has(party._id)) {
      throw new Error(
        "The Party master download contains duplicate Party IDs.",
      );
    }
    ids.add(party._id);
  }
}

//Checks that userId and cmpId are valid.
// Downloads every Party page for that company.
// Validates the complete downloaded list.
// Opens the already-authenticated user’s encrypted SQLite database.
// Replaces that company’s old downloaded Parties in one transaction.
// Returns the number downloaded.

export async function importPartyMaster(
  userId: string,
  cmpId: string,
): Promise<number> {
  if (!isNonEmptyString(userId) || !isNonEmptyString(cmpId)) {
    throw new Error("Sign in and select a company before downloading Parties.");
  }
  const parties = await downloadPartyMaster(cmpId);
  validateDownloadedParties(parties, cmpId);

  //“For this user’s already-open encrypted database,
  // run replaceDownloadedParties using its database connection,
  // then wait until it finishes.”
  // Here, database is supplied by withOfflineDatabase; we do not create it ourselves.
  await withOfflineDatabase(userId, (database) =>
    replaceDownloadedParties(database, cmpId, parties),
  );
  return parties.length;
}

export function getSavedParties(
  userId: string,
  cmpId: string,
): Promise<SavedOfflineParty[]> {
  return withOfflineDatabase(userId, (database) =>
    readSavedParties(database, cmpId),
  );
}
