import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

import type { AppThunk } from "@/store";
import {
  clearSelectedCompany,
  SELECTED_COMPANY_KEY,
} from "@/store/companySlice";
import { resetVoucherDraft } from "@/store/voucherDraftSlice";

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
  try {
    const token = await SecureStore.getItemAsync("token");
    const userStr = await SecureStore.getItemAsync("user");

    if (token && userStr) {
      const user = JSON.parse(userStr) as User;
      dispatch(setCredentials({ user, token }));
    }
  } catch (error) {
    console.error("Failed to restore the authenticated session.", error);
  } finally {
    dispatch(finishHydration());
  }
};

export default authSlice.reducer;
