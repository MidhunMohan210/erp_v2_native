// Owns the encrypted SQLite connection for the authenticated ERP user.
// All callers use this module so login, logout, and database work cannot overlap.
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

import { migrations } from "./migrations";

type AppliedMigration = { version: number };
type JournalMode = { journal_mode: string };
type ForeignKeysSetting = { foreign_keys: number };
type CipherVersion = { cipher_version: string };
type ActiveDatabase = { userId: string; connection: SQLite.SQLiteDatabase };

let activeDatabase: ActiveDatabase | null = null;
let connectionQueue: Promise<void> = Promise.resolve();
let closeFailed = false;
let lastOpenFailure: { userId: string; message: string } | null = null;

// The queue makes logout wait for database work. T means each caller still
// receives the result type of its own operation.
function inConnectionQueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = connectionQueue.then(operation);
  connectionQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function applyMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // A transaction commits schema changes and ledger entries together. If a
  // migration fails, SQLite rolls both back so the next launch can retry.
  await database.withTransactionAsync(async () => {
    const ledger = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_offline_migrations'",
    );
    const applied = ledger
      ? await database.getAllAsync<AppliedMigration>(
          "SELECT version FROM _offline_migrations ORDER BY version",
        )
      : [];

    for (let index = 0; index < applied.length; index += 1) {
      if (migrations[index]?.version !== applied[index].version) {
        throw new Error(
          `Unknown or out-of-order migration: ${applied[index].version}`,
        );
      }
    }

    for (let index = applied.length; index < migrations.length; index += 1) {
      const migration = migrations[index];
      if (index > 0 && migration.version <= migrations[index - 1].version) {
        throw new Error(
          `Migration versions must increase: ${migration.version}`,
        );
      }
      await migration.up(database);
      await database.runAsync(
        "INSERT INTO _offline_migrations (version, name) VALUES (?, ?)",
        migration.version,
        migration.name,
      );
    }
  });
}

async function userDatabaseIdentity(
  userId: string,
): Promise<{ name: string; keyName: string }> {
  // The digest gives the file and SecureStore entry safe, stable names without
  // putting a raw ERP user ID in the file name. It is not the encryption key.
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    userId,
  );
  return {
    name: `erp_v2_user_${digest}.db`,
    keyName: `offline.db.key.${digest}`,
  };
}

async function hasStoredAuthenticationFor(userId: string): Promise<boolean> {
  const token = await SecureStore.getItemAsync("token");
  const savedUser = await SecureStore.getItemAsync("user");
  try {
    const parsed: unknown = savedUser ? JSON.parse(savedUser) : null;
    return Boolean(
      token &&
      parsed &&
      typeof parsed === "object" &&
      "_id" in parsed &&
      parsed._id === userId,
    );
  } catch {
    // A corrupt saved user is treated as unauthenticated for local access.
    return false;
  }
}

async function assertSQLCipherAvailable(): Promise<void> {
  // Probe an in-memory SQLite connection first. If this development binary
  // lacks SQLCipher, no user database file is created even as an empty file.
  let probe: SQLite.SQLiteDatabase | null = null;
  try {
    probe = await SQLite.openDatabaseAsync(":memory:", {
      useNewConnection: true,
    });
    const cipher = await probe.getFirstAsync<CipherVersion>(
      "PRAGMA cipher_version",
    );
    if (!cipher?.cipher_version) {
      throw new Error(
        "SQLCipher is unavailable in this app build. Rebuild the development app.",
      );
    }
  } catch {
    throw new Error(
      "SQLCipher is unavailable in this app build. Rebuild the development app.",
    );
  } finally {
    if (probe) {
      try {
        await probe.closeAsync();
      } catch {
        closeFailed = true;
        throw new Error(
          "The offline database could not be closed. Restart the app.",
        );
      }
    }
  }
}

/*
 * Open and prepare one user's encrypted database:
 * 1. Confirm the app is running on Android or iOS.
 * 2. Confirm this app build contains SQLCipher.
 * 3. Work out this user's database file name and check if it exists.
 * 4. Get the user's key from SecureStore, or create one for a new file.
 *    Stop if an existing file has lost its key.
 * 5. Open the database file and apply the key.
 * 6. Read the database schema to confirm the key unlocked it.
 * 7. Enable WAL and foreign-key checks.
 * 8. Run any migrations this database has not completed.
 * 9. Return the ready connection.
 *
 * If preparation fails after opening the file, close the connection.
 * Keep the file and key; do not delete or replace existing data.
 */

async function openAndInitialize(
  userId: string,
): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    throw new Error("The offline database supports Android and iOS only.");
  }

  //The app opens a temporary database in memory and asks whether SQLCipher is available. If the installed build lacks it, we stop before opening a user’s file.
  await assertSQLCipherAvailable();

  //userDatabaseIdentity(userId) makes names for this user. Its result looks roughly like:
  //   {
  //   name: "erp_v2_user_<digest>.db",
  //   keyName: "offline.db.key.<digest>"
  // }
  const identity = await userDatabaseIdentity(userId);

  ///SQLite.defaultDatabaseDirectory is the folder where Expo keeps SQLite files. new File(folder, identity.name) points to this user’s file in that folder. It does not create or open the file.
  // Third line: file.exists gives us a simple true or false:
  const file = new File(
    `file://${SQLite.defaultDatabaseDirectory}`,
    identity.name,
  );
  const fileExists = file.exists;

  //  * Get this user's encryption key from SecureStore.
  //  * - If a key exists, reuse it to unlock the same database as before.
  //  * - If both the key and database file are new, generate and save a random key.
  //  * - If the file exists but its key is missing, stop. A new key cannot
  //  *   unlock the existing data.
  //  * Finally, check that the key has the expected format.
  //  */
  let key = await SecureStore.getItemAsync(identity.keyName);
  if (!key && fileExists) {
    throw new Error(
      "The encryption key for this existing offline database is missing.",
    );
  }
  if (!key) {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    key = Array.from(randomBytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    await SecureStore.setItemAsync(identity.keyName, key);
  }
  if (!/^[0-9a-f]{64}$/.test(key)) {
    throw new Error("The stored offline database key is invalid.");
  }

  let database: SQLite.SQLiteDatabase | null = null;
  try {
    // Step 3: Open the user-specific file and unlock it before reading tables.
    database = await SQLite.openDatabaseAsync(identity.name);
    const cipher = await database.getFirstAsync<CipherVersion>(
      "PRAGMA cipher_version",
    );
    if (!cipher?.cipher_version) {
      throw new Error(
        "SQLCipher is unavailable in this app build. Rebuild the development app.",
      );
    }
    // Never log this SQL statement or return its native error to the UI.
    //PRAGMA key tells SQLCipher which encryption key to use on this connection. The x'...' format tells SQLCipher that key contains hexadecimal bytes.
    //database.execAsync(...) sends that command to the SQLite library inside the installed app. Our Android build uses SQLCipher as that library, so it interprets PRAGMA key as “use this encryption key for this connection.”
    await database.execAsync(`PRAGMA key = "x'${key}'"`);
    try {
      //The previous command applied the key to this database connection:
      //After that, SQLCipher uses the key automatically whenever this connection reads or writes the file:
      //t

      //sqlite_master is SQLite’s list of tables and other database structures. This query makes SQLCipher read the database file using the key we just supplied.
      // - If the read succeeds, the connection can access the file.
      // - If the key is wrong, the read fails. The code closes the connection and reports that the database could not be unlocked.
      await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sqlite_master",
      );
    } catch {
      throw new Error(
        "Could not unlock the offline database. Its key may be incorrect.",
      );
    }

    // Step 4: Reuse WAL, foreign-key checks, and numbered migrations.
    const journal = await database.getFirstAsync<JournalMode>(
      "PRAGMA journal_mode = WAL",
    );
    if (journal?.journal_mode.toLowerCase() !== "wal") {
      throw new Error("SQLite could not enable WAL journal mode.");
    }
    await database.execAsync("PRAGMA foreign_keys = ON");
    const foreignKeys = await database.getFirstAsync<ForeignKeysSetting>(
      "PRAGMA foreign_keys",
    );
    if (foreignKeys?.foreign_keys !== 1) {
      throw new Error("SQLite could not enable foreign-key checks.");
    }
    await applyMigrations(database);
    return database;
  } catch (error) {
    if (database) {
      try {
        await database.closeAsync();
      } catch {
        closeFailed = true;
      }
    }
    // Native errors may contain SQL text, including PRAGMA key. Only expose
    // messages written here; never pass an unknown native error to the UI.
    if (
      error instanceof Error &&
      (error.message.startsWith("SQLCipher is unavailable") ||
        error.message.startsWith("Could not unlock") ||
        error.message.startsWith("SQLite could not enable") ||
        error.message.startsWith("Unknown or out-of-order migration") ||
        error.message.startsWith("Migration versions must increase"))
    ) {
      throw error;
    }
    throw new Error(
      "Offline database initialization failed. The database was preserved.",
    );
  }
}

// Think of activateOfflineDatabase as the manager of the one database connection the app is using right now. It receives the ID of the user who just logged in.
/*
 * Activate the database for the authenticated user:
 * 1. Wait for earlier database work to finish.
 * 2. Reject an empty user ID or an unsafe connection state.
 * 3. If another user's database is open, close its connection.
 * 4. Check that the saved token and user belong to this user ID.
 * 5. If this user's database is already open, reuse it.
 * 6. Otherwise, open and initialize this user's database.
 * 7. Save the resulting connection as the active database.
 *
 * If opening fails, keep the database unavailable and save a safe error
 * message for the development check.
 */
export function activateOfflineDatabase(userId: string): Promise<void> {
  return inConnectionQueue(async () => {
    if (!userId.trim())
      throw new Error("An authenticated user ID is required.");
    if (closeFailed)
      throw new Error(
        "The offline database could not be closed. Restart the app.",
      );
    // Revoke A's connection before attempting to open B, even if B's saved
    // authentication is incomplete or its database initialization fails.
    if (activeDatabase && activeDatabase.userId !== userId) {
      await closeActiveConnection();
    }
    // Only the login/restore path has saved matching authentication data.
    // Knowing a user ID alone must not let a caller open that user's file.
    if (!(await hasStoredAuthenticationFor(userId))) {
      throw new Error(
        "Authentication is required to open this offline database.",
      );
    }
    if (activeDatabase?.userId === userId) return;
    try {
      const connection = await openAndInitialize(userId);
      activeDatabase = { userId, connection };

      // activeDatabase = {
      //   userId: "user-A-id",
      //   connection: /* the open SQLiteDatabase object for User A's file */
      // };
      //connection is an Expo SQLiteDatabase object. Think of it as a remote control for the database file: it holds information about the connection and functions you can call to work with the file.

      lastOpenFailure = null;
    } catch (error) {
      // Keep a safe, useful reason for the development check. Unknown native
      // errors may include SQL text, so only these app-written messages pass.
      const message =
        error instanceof Error &&
        /^(The encryption key|The stored offline database key|SQLCipher is unavailable|Could not unlock|SQLite could not enable|Unknown or out-of-order migration|Migration versions must increase|The offline database supports)/.test(
          error.message,
        )
          ? error.message
          : "Offline database initialization failed. The database was preserved.";
      lastOpenFailure = { userId, message };
      throw new Error(message);
    }
  });
}

async function closeActiveConnection(): Promise<void> {
  const current = activeDatabase;
  activeDatabase = null; // Access stops immediately, even if close fails.
  if (!current) return;
  try {
    await current.connection.closeAsync();
  } catch {
    closeFailed = true;
    throw new Error(
      "The offline database could not be closed. Restart the app.",
    );
  }
}

// Logout closes the connection, never the file or its SecureStore key.
export function closeOfflineDatabase(): Promise<void> {
  return inConnectionQueue(closeActiveConnection);
}

//withOfflineDatabase(userId, work). It is the safe way to use a database connection that is already open. It does not open the file again
// Wait until earlier database work finishes
//   → Is this user's database the active one?
//   → Does saved authentication still belong to this user?
//   → Give the open connection to the requested work
//   → Return that work's result
// Here, work means “the SQLite task we want to perform.” The current SQLite Foundation Check uses this function to run its test queries.
export function withOfflineDatabase<T>(
  userId: string,
  work: (database: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  return inConnectionQueue(async () => {
    if (!activeDatabase || activeDatabase.userId !== userId) {
      if (lastOpenFailure?.userId === userId) {
        throw new Error(lastOpenFailure.message);
      }
      throw new Error(
        "No offline database is ready for the authenticated user.",
      );
    }
    if (!(await hasStoredAuthenticationFor(userId))) {
      throw new Error(
        "Authentication is required to use this offline database.",
      );
    }
    return work(activeDatabase.connection);
  });
}
