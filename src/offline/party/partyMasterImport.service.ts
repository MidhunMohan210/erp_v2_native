import { withMasterDownloadGuard, type MasterDownloadGuard } from "@/offline/downloads/masterDownloadGuard.service";
import { withOfflineDatabase } from "@/offline/database/database";
import { downloadPartyMaster, type PartyMasterDownloadProgress } from "@/offline/downloads/partyMasterDownload.service";

import {
  countDownloadedParties,
  readSavedParties,
  replaceDownloadedParties,
  type OfflineParty,
  type SavedOfflineParty,
} from "./partyMasterRepository";
import {
  readPartyMasterDownloadMetadata,
  savePartyMasterDownloadMetadata,
  type PartyMasterDownloadMetadata,
} from "./partyMasterDownloadMetadata.service";

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

export type PartyMasterDownloadStatus = {
  metadata: PartyMasterDownloadMetadata | null;
  storedCount: number;
  isComplete: boolean;
};

export async function importPartyMaster(
  userId: string,
  cmpId: string,
  existingGuard?: MasterDownloadGuard,
  onSaving?: () => void,
  onProgress?: (progress: PartyMasterDownloadProgress) => void,
): Promise<PartyMasterDownloadMetadata> {
  if (!isNonEmptyString(userId) || !isNonEmptyString(cmpId)) {
    throw new Error("Sign in and select a company before downloading Parties.");
  }
  return withMasterDownloadGuard(userId, cmpId, async (guard) => {
    const parties = await downloadPartyMaster(cmpId, (progress) => {
      guard.assertCurrent();
      onProgress?.(progress);
    });
    guard.assertCurrent();
    validateDownloadedParties(parties, cmpId);
    onSaving?.();

    // Keep the old snapshot and receipt unless both rows and completion are saved.
    const metadata: PartyMasterDownloadMetadata = {
      companyId: cmpId,
      partyCount: parties.length,
      completedAt: new Date().toISOString(),
    };
    guard.assertCurrent();
    await withOfflineDatabase(userId, (database) => {
      guard.assertCurrent();
      return replaceDownloadedParties(database, cmpId, parties, async (transaction) => {
        guard.assertCurrent();
        await savePartyMasterDownloadMetadata(transaction, metadata);
        guard.assertCurrent();
      });
    });
    return metadata;
  }, existingGuard);
}

export function getSavedParties(
  userId: string,
  cmpId: string,
): Promise<SavedOfflineParty[]> {
  return withOfflineDatabase(userId, (database) =>
    readSavedParties(database, cmpId),
  );
}

/** Completion needs both the saved receipt and matching downloaded Party rows. */
export async function getPartyMasterDownloadStatus(
  userId: string,
  cmpId: string,
): Promise<PartyMasterDownloadStatus> {
  const metadata = await readPartyMasterDownloadMetadata(userId, cmpId);
  if (!metadata) return { metadata: null, storedCount: 0, isComplete: false };

  const storedCount = await withOfflineDatabase(userId, (database) =>
    countDownloadedParties(database, cmpId),
  );
  return {
    metadata,
    storedCount,
    isComplete: storedCount === metadata.partyCount,
  };
}
