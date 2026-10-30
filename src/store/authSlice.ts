import { createSlice, PayloadAction, type Dispatch } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

import type { AppThunk } from "@/store";
import { clearSelectedCompany } from "@/store/companySlice";
import { resetVoucherDraft } from "@/store/voucherDraftSlice";
import { resetSaleDraft } from "@/store/saleDraftSlice";
import { clearReceiptDraft } from "@/store/receiptDraftSlice";
import { resetAppMode } from "@/store/appModeSlice";
import { queryClient } from "@/lib/queryClient";
import { CONFIG } from "@/constants/config";
import {
  endAuthSession,
  getCurrentAuthGeneration,
  isCurrentAuthGeneration,
  startAuthSession,
} from "@/services/authSessionGeneration";
import { LEGACY_SELECTED_COMPANY_KEY } from "@/services/companySelectionPersistence";
import {
  activateOfflineDatabase,
  closeOfflineDatabase,
} from "@/offline/database/database";

//Promise.resolve() creates an already completed Promise.
// So the first auth operation has nothing to wait for and can start.
// After that, the variable holds the Promise for the most recent operation, making the next operation wait.
//It makes authentication operations happen one after another, so two operations cannot change the saved login at the same time.
let authChangeQueue: Promise<void> = Promise.resolve();

// Give every login request a number when it starts. If the user starts a
// second login before the first response returns, only the newest number may
// save credentials. This stops a late response from an older login replacing
// the current user's token, Redux state, or encrypted SQLite connection.
let latestLoginAttempt = 0;

export function beginLoginAttempt(): number {
  latestLoginAttempt += 1;
  return latestLoginAttempt;
}

export function isLatestLoginAttempt(attempt: number): boolean {
  return attempt === latestLoginAttempt;
}

//with queue:
//User A login: enters queue → saves token A → finishes
//User B login: waits         → saves token B → finishes
function queueAuthChange(
  generation: number,
  change: () => Promise<void>,
): Promise<void> {
  const result = authChangeQueue.then(async () => {
    //“After the previous auth task completes,
    // check whether this task still belongs to the current session. If yes, run it.”
    //change() is the actual work  like await SecureStore.setItemAsync("token", token);
    if (isCurrentAuthGeneration(generation)) await change();
  });
  // If this task fails, recover the queue so the next login or logout can run.
  // `result` still keeps its error for the current caller; only the queue
  // becomes ready again instead of staying failed forever.
  authChangeQueue = result.catch(() => undefined);
  return result;
}

// API requests wait for any credential write or delete already in progress.
// The interceptor also checks its generation before using the returned token.
export function readStoredAuthToken(): Promise<string | null> {
  return authChangeQueue.then(() => SecureStore.getItemAsync("token"));
}

// Online login remains usable if the optional offline connection fails.
async function prepareOfflineDatabase(userId: string): Promise<void> {
  try {
    await activateOfflineDatabase(userId);
  } catch {
    if (__DEV__)
      console.warn("The authenticated user's offline database is unavailable.");
  }
}

async function releaseOfflineDatabase(): Promise<void> {
  try {
    await closeOfflineDatabase();
  } catch {
    if (__DEV__)
      console.warn(
        "The offline database could not close safely. Restart the app.",
      );
  }
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
}

type AuthState = {
  user: User | null;
  token: string | null;
  companyId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

type PersistAuthPayload = {
  user: User;
  token: string;
};

type BackendUser = {
  _id?: unknown;
  id?: unknown;
  name?: unknown;
  userName?: unknown;
  email?: unknown;
  role?: unknown;
};

function isValidUser(value: unknown): value is User {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Partial<User>;

  return (
    typeof user._id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    (user.role === "admin" || user.role === "staff")
  );
}

function normalizeBackendUser(value: unknown): User | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const user = value as BackendUser;
  const id = typeof user._id === "string" ? user._id : user.id;
  const name = typeof user.name === "string" ? user.name : user.userName;

  const normalizedUser = {
    _id: id,
    name,
    email: user.email,
    role: user.role,
  };

  return isValidUser(normalizedUser) ? normalizedUser : null;
}

// Delete session values together inside the auth queue. Keep database keys.
async function clearStoredAuthData(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync("token"),
    SecureStore.deleteItemAsync("user"),
    SecureStore.deleteItemAsync(LEGACY_SELECTED_COMPANY_KEY),
  ]);
}

const initialState: AuthState = {
  user: null,
  token: null,
  companyId: null,
  isAuthenticated: false,
  isLoading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<PersistAuthPayload>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.companyId = null;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.companyId = null;
      state.isAuthenticated = false;
      // If secure storage still contains a session, restore it after Redux resets.
      state.isLoading = true;
    },
    resetAuth: () => ({
      ...initialState,
      isLoading: true,
    }),
    finishHydration: (state) => {
      state.isLoading = false;
    },
  },
});

export const { clearCredentials, finishHydration, resetAuth, setCredentials } =
  authSlice.actions;

function clearInMemoryAuth(dispatch: Dispatch): void {
  // Clear server data before another account can render cached results.
  queryClient.clear();
  dispatch(resetAppMode());
  dispatch(clearSelectedCompany());
  dispatch(clearReceiptDraft());
  dispatch(resetVoucherDraft());
  dispatch(resetSaleDraft());
  dispatch(clearCredentials());
}

// A restore failure may clear only the session it started with. The queue
// waits for earlier writes; a newer login makes this cleanup skip entirely.
async function clearRestoredSession(
  restoreGeneration: number,
  dispatch: Dispatch,
): Promise<void> {
  if (!isCurrentAuthGeneration(restoreGeneration)) return;
  const cleanupGeneration = endAuthSession();
  await queueAuthChange(cleanupGeneration, async () => {
    await releaseOfflineDatabase();
    if (!isCurrentAuthGeneration(cleanupGeneration)) return;
    await clearStoredAuthData();
    if (isCurrentAuthGeneration(cleanupGeneration)) {
      clearInMemoryAuth(dispatch);
      dispatch(finishHydration());
    }
  });
}

///“A login has succeeded.
// Safely save this user’s login, update the app, and open this user’s encrypted SQLite database.”
// This is an AppThunk because login must wait for SecureStore and SQLite work.
// Normal Redux actions only update state immediately and cannot use `await`.
// but this thunk can wait for the async work to finish before returning.
// Login order:
// → check the token and login attempt
// → start a new session generation and wait in the auth queue
// → close the old SQLite connection
// → save token and user in SecureStore
// → check that this is still the current session
// → clear old in-memory company and drafts when the user changes
// → update Redux with the new credentials
// → open the new user's encrypted SQLite database

export const persistAuth =
  (
    user: User,
    token: string,
    expectedAttempt?: number,
  ): AppThunk<Promise<boolean>> =>
  async (dispatch, getState) => {
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("Invalid auth token returned by login.");
    }
    if (
      expectedAttempt !== undefined &&
      !isLatestLoginAttempt(expectedAttempt)
    ) {
      return false;
    }

    // Advance before storage awaits so responses from an earlier session are stale.
    const loginGeneration = startAuthSession();
    let applied = false;
    //“Put this login work into the authentication queue.
    // Wait until earlier authentication work completes. Then run this login work.”
    await queueAuthChange(loginGeneration, async () => {
      // Close the old user's connection before saving the new identity.
      await releaseOfflineDatabase();
      if (!isCurrentAuthGeneration(loginGeneration)) return;
      // These two writes are serialized with every other auth change. If a
      // newer session starts during either write, its queued work runs next.
      try {
        await SecureStore.setItemAsync("token", token);
        await SecureStore.setItemAsync("user", JSON.stringify(user));
      } catch (error) {
        // A failed second write could pair one user's token with another
        // user's saved record. Clear that incomplete pair before retrying.
        if (isCurrentAuthGeneration(loginGeneration)) {
          await clearStoredAuthData();
          clearInMemoryAuth(dispatch); //Clear login-related data from Redux memory.
          dispatch(finishHydration()); //“Authentication checking is finished.”
        }
        throw error;
      }
      if (!isCurrentAuthGeneration(loginGeneration)) return;

      //“Is the currently remembered Redux user different from the newly logged-in user?”
      if (getState().auth.user?._id !== user._id) {
        queryClient.clear();
        dispatch(resetAppMode());
        // A replacement must not inherit the old account's company or drafts.
        dispatch(clearSelectedCompany());
        dispatch(clearReceiptDraft());
        dispatch(resetVoucherDraft());
        dispatch(resetSaleDraft());
      }
      dispatch(setCredentials({ user, token }));
      applied = true;
      // Company switching does not change this user-owned connection.
      await prepareOfflineDatabase(user._id);
    });
    return applied && isCurrentAuthGeneration(loginGeneration);
  };

// Manual logout always ends the current session. Automatic 401 logout passes
// its request generation so a delayed old response cannot end a newer login.
export const logoutAuth =
  (expectedGeneration?: number): AppThunk =>
  async (dispatch) => {
    if (
      expectedGeneration !== undefined &&
      !isCurrentAuthGeneration(expectedGeneration)
    )
      return;
    // A pending login response must not sign in after the user logs out.
    latestLoginAttempt += 1;
    const logoutGeneration = endAuthSession();
    await queueAuthChange(logoutGeneration, async () => {
      await releaseOfflineDatabase();
      if (!isCurrentAuthGeneration(logoutGeneration)) return;
      await clearStoredAuthData();
      if (isCurrentAuthGeneration(logoutGeneration)) {
        clearInMemoryAuth(dispatch);
        dispatch(finishHydration());
      }
    });
  };

// Restore order when the app opens:
// → remember the current session generation
// → wait in the auth queue, then read saved token and user together
// → stop if a newer login or logout started while reading
// → when there is no token, safely clear the incomplete saved session
// → ask the backend whether the saved token is valid
// → on 401 or 403, safely clear the saved session
// → on success, save the backend's latest user details, start a session,
//   update Redux, and open that user's encrypted SQLite database
// → on a network failure, validate and use the saved user if available
// → on corrupt or incomplete saved data, safely clear the saved session
// Every later step checks its generation so old restore work cannot affect a
// newer login. Clearing a session closes only the active database connection;
// it does not delete encrypted database files, keys, or pending submissions.
export const rehydrateAuth = (): AppThunk => async (dispatch) => {
  const restoreGeneration = getCurrentAuthGeneration();
  let token: string | null = null;
  let savedUserString: string | null = null;
  let verifiedUser: User | null = null;

  try {
    // Read both values between queued writes and deletes, so they belong to
    // one completed storage change rather than two different logins.
    await queueAuthChange(restoreGeneration, async () => {
      token = await SecureStore.getItemAsync("token");
      savedUserString = await SecureStore.getItemAsync("user");
    });
    if (!isCurrentAuthGeneration(restoreGeneration)) return;

    if (!token) {
      await clearRestoredSession(restoreGeneration, dispatch);
      return;
    }
    const restoredToken = token;

    const response = await fetch(`${CONFIG.BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${restoredToken}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      await clearRestoredSession(restoreGeneration, dispatch);
      return;
    }

    if (!response.ok) {
      throw new Error(
        `Session verification failed with status ${response.status}.`,
      );
    }

    const data = (await response.json()) as {
      user?: unknown;
    };
    const currentUser = normalizeBackendUser(data.user);
    if (!currentUser) {
      throw new Error("The backend returned invalid current-user data.");
    }
    verifiedUser = currentUser;

    await queueAuthChange(restoreGeneration, async () => {
      // A newer login may start while SecureStore writes this refreshed user.
      await SecureStore.setItemAsync("user", JSON.stringify(currentUser));
      if (!isCurrentAuthGeneration(restoreGeneration)) return;

      //  App starts with saved User A session
      // → backend confirms User A token
      // → start a fresh active session for User A
      startAuthSession();
      dispatch(setCredentials({ user: currentUser, token: restoredToken }));
      await prepareOfflineDatabase(currentUser._id);
    });
  } catch (error) {
    if (!isCurrentAuthGeneration(restoreGeneration)) return;
    // A storage failure after the server verified a user must not fall back
    // to an older saved user with the same token.
    if (verifiedUser) {
      await clearRestoredSession(restoreGeneration, dispatch);
      return;
    }
    // Keep the existing offline-login behavior for a valid saved user.
    if (token && savedUserString) {
      try {
        const offlineToken = token;
        const savedUser: unknown = JSON.parse(savedUserString);
        if (!isValidUser(savedUser)) {
          throw new Error("Stored user data is invalid.");
        }
        await queueAuthChange(restoreGeneration, async () => {
          startAuthSession();
          dispatch(setCredentials({ user: savedUser, token: offlineToken }));
          await prepareOfflineDatabase(savedUser._id);
        });
      } catch {
        await clearRestoredSession(restoreGeneration, dispatch);
      }
    } else {
      await clearRestoredSession(restoreGeneration, dispatch);
    }

    if (__DEV__) {
      console.error("Could not restore the saved login session.", error);
    }
  } finally {
    // A stale restore must not change the loading state of a newer session.
    if (isCurrentAuthGeneration(restoreGeneration)) dispatch(finishHydration());
  }
};

export default authSlice.reducer;
