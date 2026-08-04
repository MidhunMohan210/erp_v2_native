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
  await SecureStore.deleteItemAsync("token");
  await SecureStore.deleteItemAsync("user");
  await SecureStore.deleteItemAsync(SELECTED_COMPANY_KEY);
  dispatch(clearSelectedCompany());
  dispatch(resetVoucherDraft());
  dispatch(clearCredentials());
};

export const rehydrateAuth = (): AppThunk => async (dispatch) => {
  /*
   * Read the previously saved token and user.
   *
   * The token is needed for /api/auth/me.
   * The stored user is used only as a fallback when the server
   * cannot be reached because of a network problem.
   */
  const token = await SecureStore.getItemAsync("token");
  const savedUserString = await SecureStore.getItemAsync("user");

  try {
    /*
     * No token means there is no login session to restore.
     */
    if (!token) {
      /*
       * Remove an old user value if a user exists without a token.
       */
      await SecureStore.deleteItemAsync("user");
      return;
    }

    /*
     * Ask the backend whether the stored token is still valid.
     *
     * We send the token in the Authorization header.
     */
    const response = await fetch(
      `${CONFIG.BASE_URL}/api/auth/me`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    /*
     * 401 means:
     * - token is invalid
     * - token is expired
     * - token was created using the previous JWT secret
     *
     * 403 may mean:
     * - user is blocked
     * - user is no longer allowed to use the application
     *
     * In both cases, remove the stored session.
     */
    if (response.status === 401 || response.status === 403) {
      await Promise.allSettled([
        SecureStore.deleteItemAsync("token"),
        SecureStore.deleteItemAsync("user"),
        SecureStore.deleteItemAsync(SELECTED_COMPANY_KEY),
      ]);

      dispatch(clearSelectedCompany());
      dispatch(resetVoucherDraft());
      dispatch(clearCredentials());

      return;
    }

    /*
     * Other unsuccessful responses may be server problems.
     *
     * For example:
     * - 500 server error
     * - 502 gateway error
     * - temporary backend problem
     */
    if (!response.ok) {
      throw new Error(
        `Session verification failed with status ${response.status}.`,
      );
    }

    /*
     * The backend returns:
     *
     * {
     *   user: { ... }
     * }
     */
    const data = (await response.json()) as {
      user?: User;
    };

    /*
     * The response must contain a user.
     */
    if (!data.user) {
      throw new Error(
        "The backend did not return the current user.",
      );
    }

    /*
     * Save the latest user details returned by the backend.
     *
     * This updates changes such as:
     * - name changed
     * - email changed
     * - role changed
     */
    await SecureStore.setItemAsync(
      "user",
      JSON.stringify(data.user),
    );

    /*
     * Put the verified token and latest user into Redux.
     */
    dispatch(
      setCredentials({
        user: data.user,
        token,
      }),
    );
  } catch (error) {
    /*
     * This catch normally handles:
     * - no internet
     * - backend temporarily unavailable
     * - failed JSON response
     *
     * We should not delete a valid login simply because the phone
     * temporarily has no internet.
     */
    if (token && savedUserString) {
      try {
        const savedUser = JSON.parse(savedUserString) as User;

        /*
         * Temporarily restore the previously saved session.
         *
         * When the internet returns, normal API requests will verify
         * the token. Your Axios 401 interceptor will log the user out
         * if the token is actually invalid.
         */
        dispatch(
          setCredentials({
            user: savedUser,
            token,
          }),
        );
      } catch {
        /*
         * The stored user JSON is damaged.
         * Remove the incomplete session.
         */
        await Promise.allSettled([
          SecureStore.deleteItemAsync("token"),
          SecureStore.deleteItemAsync("user"),
          SecureStore.deleteItemAsync(SELECTED_COMPANY_KEY),
        ]);

        dispatch(clearSelectedCompany());
        dispatch(resetVoucherDraft());
        dispatch(clearCredentials());
      }
    }

    /*
     * Log details only during development.
     *
     * Do not print the token or stored user here.
     */
    if (__DEV__) {
      console.error(
        "Could not verify the saved login session.",
        error,
      );
    }
  } finally {
    /*
     * Whether restoration succeeds or fails, startup authentication
     * checking has finished.
     */
    dispatch(finishHydration());
  }
};

export default authSlice.reducer;
