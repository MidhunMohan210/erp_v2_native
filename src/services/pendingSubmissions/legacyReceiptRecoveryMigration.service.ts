import {
  pendingSubmissionStorageService,
  type AsyncKeyValueStorage,
  type PendingSubmissionStorage,
} from "./pendingSubmissionStorage.service";
import {
  getReceiptRecoveryStorageKey,
  parseReceiptSubmissionRecovery,
} from "../../utils/receiptRecovery";
import { saveReceiptPendingSubmission } from "./receiptPendingSubmission.service";

function getPendingStatus(state: "submitting" | "uncertain" | "conflict"):
  "uncertain" | "conflict" {
  return state === "conflict" ? "conflict" : "uncertain";
}

export function createLegacyReceiptRecoveryMigrator(
  legacyStorage: AsyncKeyValueStorage,
  pendingStorage: PendingSubmissionStorage,
  now: () => string = () => new Date().toISOString(),
) {
  return {
    async migrate(userId: string, companyId: string): Promise<boolean> {
      const key = getReceiptRecoveryStorageKey(userId, companyId);
      const storedValue = await legacyStorage.getItem(key);
      const recovery = parseReceiptSubmissionRecovery(storedValue, userId, companyId);

      // Invalid legacy data is left untouched. We must never invent a request
      // body or delete a record that cannot be migrated safely.
      if (!recovery) return false;

      await saveReceiptPendingSubmission(
        {
          userId,
          companyId,
          payload: recovery.payload,
          status: getPendingStatus(recovery.state),
        },
        pendingStorage,
        now,
      );
      await legacyStorage.removeItem(key);
      return true;
    },
  };
}

async function getLegacyAsyncStorage(): Promise<AsyncKeyValueStorage> {
  const module = await import("@react-native-async-storage/async-storage");
  return module.default;
}

export async function migrateLegacyReceiptRecovery(
  userId: string,
  companyId: string,
): Promise<boolean> {
  const legacyStorage = await getLegacyAsyncStorage();
  const migrator = createLegacyReceiptRecoveryMigrator(
    legacyStorage,
    pendingSubmissionStorageService,
  );
  return migrator.migrate(userId, companyId);
}
