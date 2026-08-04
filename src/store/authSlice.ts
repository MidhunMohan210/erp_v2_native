import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

import type { AppThunk } from "@/store";
import {
  clearSelectedCompany,
  SELECTED_COMPANY_KEY,
} from "@/store/companySlice";
import { resetVoucherDraft } from "@/store/voucherDraftSlice";
import { CONFIG } from "@/constants/config";

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

/*
 * Remove all authentication-related values from SecureStore.
 *
 * Promise.allSettled tries every deletion even when one fails.
 */
async function clearStoredAuthData(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync("token"),
    SecureStore.deleteItemAsync("user"),
    SecureStore.deleteItemAsync(SELECTED_COMPANY_KEY),
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

export const persistAuth =
  (user: User, token: string): AppThunk =>
  async (dispatch) => {
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("Invalid auth token returned by login.");
    }

    await SecureStore.setItemAsync("token", token);
    await SecureStore.setItemAsync("user", JSON.stringify(user));
    dispatch(setCredentials({ user, token }));
  };

export const logoutAuth = (): AppThunk => async (dispatch) => {
  /*
   * Try to delete all stored values.
   *
   * Promise.allSettled means:
   * even if one deletion fails, the others will still be attempted.
   */
  await Promise.allSettled([
    SecureStore.deleteItemAsync("token"),
    SecureStore.deleteItemAsync("user"),
    SecureStore.deleteItemAsync(SELECTED_COMPANY_KEY),
  ]);

  /*
   * Always clear the application's in-memory state.
   */
  dispatch(clearSelectedCompany());
  dispatch(resetVoucherDraft());
  dispatch(clearCredentials());
};

export const rehydrateAuth = (): AppThunk => async (dispatch) => {
  /*
   * Start with null because reading SecureStore can also fail.
   */
  let token: string | null = null;
  let savedUserString: string | null = null;

  try {
    /*
     * Read the previously stored authentication information.
     */
    token = await SecureStore.getItemAsync("token");
    savedUserString = await SecureStore.getItemAsync("user");

    /*
     * No token means there is no valid session to restore.
     *
     * We also remove any old user, company or draft data
     * that may still remain on the phone.
     */
    if (!token) {
      await clearStoredAuthData();

      dispatch(clearSelectedCompany());
      dispatch(resetVoucherDraft());
      dispatch(clearCredentials());

      return;
    }

    /*
     * Ask the backend whether the token is still valid.
     */
    const response = await fetch(`${CONFIG.BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    /*
     * 401:
     * Token is missing, invalid or expired.
     *
     * 403:
     * The user may be blocked or no longer allowed.
     *
     * In both cases, remove the session.
     */
    if (response.status === 401 || response.status === 403) {
      await clearStoredAuthData();

      dispatch(clearSelectedCompany());
      dispatch(resetVoucherDraft());
      dispatch(clearCredentials());

      return;
    }

    /*
     * Handle server errors such as 500 or 502.
     *
     * The catch block will temporarily restore the saved user
     * when possible.
     */
    if (!response.ok) {
      throw new Error(
        `Session verification failed with status ${response.status}.`,
      );
    }

    /*
     * The expected backend response is:
     *
     * {
     *   user: {
     *     _id: "...",
     *     name: "...",
     *     email: "...",
     *     role: "admin"
     *   }
     * }
     *
     * We initially treat user as unknown because backend data
     * must be checked while the app is running.
     */
    const data = (await response.json()) as {
      user?: unknown;
    };

    /*
     * Verify that the backend returned a valid user object.
     */
    if (!isValidUser(data.user)) {
      throw new Error("The backend returned invalid current-user data.");
    }

    /*
     * At this point, TypeScript knows that data.user is a User
     * because it passed isValidUser().
     */
    const currentUser = data.user;

    /*
     * Store the latest user details.
     *
     * This updates locally stored information when the user's
     * name, email or role has changed.
     */
    await SecureStore.setItemAsync("user", JSON.stringify(currentUser));

    /*
     * Put the verified token and latest user into Redux memory.
     */
    dispatch(
      setCredentials({
        user: currentUser,
        token,
      }),
    );
  } catch (error) {
    /*
     * This block may run when:
     *
     * - the phone has no internet
     * - the backend is temporarily unavailable
     * - the backend returned invalid JSON
     * - SecureStore reading failed
     */

    if (token && savedUserString) {
      try {
        /*
         * JSON.parse returns data whose structure is unknown.
         */
        const savedUser: unknown = JSON.parse(savedUserString);

        /*
         * Validate the locally stored user before putting it
         * into Redux.
         */
        if (!isValidUser(savedUser)) {
          throw new Error("Stored user data is invalid.");
        }

        /*
         * Temporarily restore the saved session.
         *
         * This is useful when the phone only has a temporary
         * internet problem.
         */
        dispatch(
          setCredentials({
            user: savedUser,
            token,
          }),
        );
      } catch {
        /*
         * The stored JSON is damaged or does not match User.
         *
         * Remove the complete session.
         */
        await clearStoredAuthData();

        dispatch(clearSelectedCompany());
        dispatch(resetVoucherDraft());
        dispatch(clearCredentials());
      }
    } else {
      /*
       * The session is incomplete.
       *
       * Examples:
       * - token exists but user is missing
       * - user exists but token is missing
       * - SecureStore reading failed
       */
      await clearStoredAuthData();

      dispatch(clearSelectedCompany());
      dispatch(resetVoucherDraft());
      dispatch(clearCredentials());
    }

    /*
     * Show the technical error only during development.
     *
     * Do not print the token or complete user data.
     */
    if (__DEV__) {
      console.error("Could not restore the saved login session.", error);
    }
  } finally {
    /*
     * This always runs:
     *
     * - session successfully restored
     * - session rejected
     * - no internet
     * - stored data damaged
     *
     * It tells the UI that authentication checking is complete.
     */
    dispatch(finishHydration());
  }
};

export default authSlice.reducer;
