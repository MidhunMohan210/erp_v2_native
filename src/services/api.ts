import axios, { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";

import { CONFIG } from "@/constants/config";
import { queryClient } from "@/lib/queryClient";
import { store } from "@/store";
import { logoutAuth } from "@/store/authSlice";

/*
 * This prevents logout from running many times when
 * multiple API requests return 401 together.
 */
let isLoggingOut = false;

const api = axios.create({
  baseURL: CONFIG.BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * REQUEST INTERCEPTOR
 *
 * Runs before every API request.
 * Reads the token and adds it to the request header.
 */
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/*
 * RESPONSE INTERCEPTOR
 *
 * Runs after every API response.
 */
api.interceptors.response.use(
  /*
   * When the request succeeds, return the response normally.
   */
  (response) => {
    return response;
  },

  /*
   * When the request fails, Axios sends the error here.
   */
  async (error: AxiosError) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url ?? "";

    /*
     * Wrong login credentials also normally return 401.
     *
     * We should not run automatic logout when the user is
     * already trying to log in.
     */
    const isLoginRequest = requestUrl.includes("/auth/login");

    /*
     * Run logout when:
     *
     * 1. Backend returned 401.
     * 2. It was not the login request.
     * 3. Logout is not already running.
     */
    if (status === 401 && !isLoginRequest && !isLoggingOut) {
      isLoggingOut = true;

      try {
        /*
         * Remove cached products, customers, companies,
         * sale orders and other private API data.
         */
        queryClient.clear();

        /*
         * logoutAuth already removes:
         *
         * - token from SecureStore
         * - user from SecureStore
         * - selected company
         * - voucher draft
         * - Redux authentication state
         */
        await store.dispatch(logoutAuth());
      } finally {
        /*
         * Allow future 401 errors to be handled.
         */
        isLoggingOut = false;
      }
    }

    /*
     * Pass the original error back to the screen
     * or TanStack Query.
     */
    return Promise.reject(error);
  },
);

export default api;