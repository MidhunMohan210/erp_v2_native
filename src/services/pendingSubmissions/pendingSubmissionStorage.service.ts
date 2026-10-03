import type {
  PendingSubmission,
  PendingSubmissionFailureReason,
  PendingSubmissionStatus,
} from "./pendingSubmission.types";
import { emitPendingSubmissionChange } from "./pendingSubmissionChangeEvents";

const STORAGE_KEY_PREFIX = "erp.pending-submissions.v1:user";
const STORAGE_VERSION = 1;

export type AsyncKeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type StoredSubmissionCollection = {
  version: 1;
  submissions: PendingSubmission[];
};

export type PendingSubmissionUpdate = {
  status?: PendingSubmissionStatus;
  lastCheckedAt?: string | null;
  failureReason?: PendingSubmissionFailureReason | null;
  lastError?: string | null;
};

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${encodeURIComponent(userId)}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidStatus(value: unknown): value is PendingSubmissionStatus {
  return (
    value === "uncertain" ||
    value === "checking" ||
    value === "retry_available" ||
    value === "conflict" ||
    value === "rejected"
  );
}

function isValidTransactionType(value: unknown): boolean {
  return value === "receipt" || value === "sale" || value === "sale_order";
}

function isValidFailureReason(value: unknown): value is PendingSubmissionFailureReason {
  return (
    value === "timeout" ||
    value === "network" ||
    value === "server_unknown" ||
    value === "unknown"
  );
}

function isPendingSubmission(value: unknown, expectedUserId: string): value is PendingSubmission {
  if (!value || typeof value !== "object") return false;

  const submission = value as Partial<PendingSubmission>;
  const optionalFieldsAreValid =
    (submission.lastCheckedAt === undefined || isNonEmptyString(submission.lastCheckedAt)) &&
    (submission.failureReason === undefined || isValidFailureReason(submission.failureReason)) &&
    (submission.lastError === undefined || typeof submission.lastError === "string");

  return (
    isNonEmptyString(submission.id) &&
    isValidTransactionType(submission.transactionType) &&
    submission.userId === expectedUserId &&
    isNonEmptyString(submission.companyId) &&
    isNonEmptyString(submission.requestId) &&
    "payload" in submission &&
    isValidStatus(submission.status) &&
    isNonEmptyString(submission.createdAt) &&
    isNonEmptyString(submission.updatedAt) &&
    optionalFieldsAreValid
  );
}

function readCollection(value: string | null, userId: string): StoredSubmissionCollection {
  if (!value) return { version: STORAGE_VERSION, submissions: [] };

  try {
    const parsed = JSON.parse(value) as Partial<StoredSubmissionCollection>;
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.submissions)) {
      return { version: STORAGE_VERSION, submissions: [] };
    }

    return {
      version: STORAGE_VERSION,
      // One corrupt record must not make another recoverable operation disappear.
      submissions: parsed.submissions.filter((item) => isPendingSubmission(item, userId)),
    };
  } catch {
    return { version: STORAGE_VERSION, submissions: [] };
  }
}

function hasSameLogicalIdentity(first: PendingSubmission, second: PendingSubmission): boolean {
  return (
    first.userId === second.userId &&
    first.companyId === second.companyId &&
    first.transactionType === second.transactionType &&
    first.requestId === second.requestId
  );
}

function applyUpdate(
  submission: PendingSubmission,
  update: PendingSubmissionUpdate,
  updatedAt: string,
): PendingSubmission {
  const next: PendingSubmission = {
    ...submission,
    ...(update.status ? { status: update.status } : {}),
    updatedAt,
  };

  if (update.lastCheckedAt === null) delete next.lastCheckedAt;
  else if (update.lastCheckedAt !== undefined) next.lastCheckedAt = update.lastCheckedAt;

  if (update.failureReason === null) delete next.failureReason;
  else if (update.failureReason !== undefined) next.failureReason = update.failureReason;

  if (update.lastError === null) delete next.lastError;
  else if (update.lastError !== undefined) next.lastError = update.lastError;

  return next;
}

export function createPendingSubmissionStorage(
  storage: AsyncKeyValueStorage,
  now: () => string = () => new Date().toISOString(),
) {
  // AsyncStorage has no transaction primitive. Serialising writes per user
  // prevents two near-simultaneous saves from losing one another.
  const userWriteQueues = new Map<string, Promise<void>>();

  async function withUserWrite<T>(userId: string, work: () => Promise<T>): Promise<T> {
    const previous = userWriteQueues.get(userId) ?? Promise.resolve();
    let releaseQueue: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });
    const queued = previous.then(() => current);
    userWriteQueues.set(userId, queued);

    await previous;
    try {
      return await work();
    } finally {
      releaseQueue();
      if (userWriteQueues.get(userId) === queued) userWriteQueues.delete(userId);
    }
  }

  async function loadCollection(userId: string): Promise<StoredSubmissionCollection> {
    return readCollection(await storage.getItem(getStorageKey(userId)), userId);
  }

  async function saveCollection(userId: string, collection: StoredSubmissionCollection): Promise<void> {
    await storage.setItem(getStorageKey(userId), JSON.stringify(collection));
  }

  return {
    async save(submission: PendingSubmission): Promise<PendingSubmission> {
      return withUserWrite(submission.userId, async () => {
        const collection = await loadCollection(submission.userId);
        const submissions = collection.submissions.filter(
          (existing) =>
            existing.id !== submission.id && !hasSameLogicalIdentity(existing, submission),
        );
        submissions.push(submission);
        await saveCollection(submission.userId, { version: STORAGE_VERSION, submissions });
        emitPendingSubmissionChange({
          userId: submission.userId,
          companyId: submission.companyId,
        });
        return submission;
      });
    },

    async getById(userId: string, companyId: string, id: string): Promise<PendingSubmission | null> {
      const collection = await loadCollection(userId);
      return collection.submissions.find(
        (submission) => submission.companyId === companyId && submission.id === id,
      ) ?? null;
    },

    async list(userId: string): Promise<PendingSubmission[]> {
      return (await loadCollection(userId)).submissions;
    },

    async listForUserAndCompany(userId: string, companyId: string): Promise<PendingSubmission[]> {
      const collection = await loadCollection(userId);
      return collection.submissions.filter((submission) => submission.companyId === companyId);
    },

    async update(
      userId: string,
      companyId: string,
      id: string,
      update: PendingSubmissionUpdate,
    ): Promise<PendingSubmission | null> {
      return withUserWrite(userId, async () => {
        const collection = await loadCollection(userId);
        let updated: PendingSubmission | null = null;
        const submissions = collection.submissions.map((submission) => {
          if (submission.companyId !== companyId || submission.id !== id) return submission;
          updated = applyUpdate(submission, update, now());
          return updated;
        });
        if (!updated) return null;
        await saveCollection(userId, { version: STORAGE_VERSION, submissions });
        emitPendingSubmissionChange({ userId, companyId });
        return updated;
      });
    },

    async remove(userId: string, companyId: string, id: string): Promise<void> {
      await withUserWrite(userId, async () => {
        const collection = await loadCollection(userId);
        const submissions = collection.submissions.filter(
          (submission) => submission.companyId !== companyId || submission.id !== id,
        );
        await saveCollection(userId, { version: STORAGE_VERSION, submissions });
        emitPendingSubmissionChange({ userId, companyId });
      });
    },

    async clearForUserAndCompany(userId: string, companyId: string): Promise<void> {
      await withUserWrite(userId, async () => {
        const collection = await loadCollection(userId);
        const submissions = collection.submissions.filter(
          (submission) => submission.companyId !== companyId,
        );
        await saveCollection(userId, { version: STORAGE_VERSION, submissions });
        emitPendingSubmissionChange({ userId, companyId });
      });
    },

    async clearForUser(userId: string): Promise<void> {
      await withUserWrite(userId, async () => {
        await storage.removeItem(getStorageKey(userId));
        emitPendingSubmissionChange({ userId, companyId: null });
      });
    },
  };
}

export type PendingSubmissionStorage = ReturnType<typeof createPendingSubmissionStorage>;

async function getAsyncStorage(): Promise<AsyncKeyValueStorage> {
  const module = await import("@react-native-async-storage/async-storage");
  return module.default;
}

let defaultStorage: PendingSubmissionStorage | null = null;

async function getDefaultStorage(): Promise<PendingSubmissionStorage> {
  if (!defaultStorage) defaultStorage = createPendingSubmissionStorage(await getAsyncStorage());
  return defaultStorage;
}

export const pendingSubmissionStorageService = {
  async save(submission: PendingSubmission) { return (await getDefaultStorage()).save(submission); },
  async getById(userId: string, companyId: string, id: string) { return (await getDefaultStorage()).getById(userId, companyId, id); },
  async list(userId: string) { return (await getDefaultStorage()).list(userId); },
  async listForUserAndCompany(userId: string, companyId: string) { return (await getDefaultStorage()).listForUserAndCompany(userId, companyId); },
  async update(userId: string, companyId: string, id: string, update: PendingSubmissionUpdate) { return (await getDefaultStorage()).update(userId, companyId, id, update); },
  async remove(userId: string, companyId: string, id: string) { return (await getDefaultStorage()).remove(userId, companyId, id); },
  async clearForUserAndCompany(userId: string, companyId: string) { return (await getDefaultStorage()).clearForUserAndCompany(userId, companyId); },
  async clearForUser(userId: string) { return (await getDefaultStorage()).clearForUser(userId); },
};
