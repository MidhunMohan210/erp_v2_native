import axios, { AxiosError } from "axios";

import { CONFIG } from "@/constants/config";
import { queryClient } from "@/lib/queryClient";
import { store } from "@/store";
import { logoutAuth, readStoredAuthToken } from "@/store/authSlice";
import {
  attachAuthGeneration,
  finishUnauthorizedLogout,
  getCurrentAuthGeneration,
  isCurrentAuthGeneration,
  shouldStartUnauthorizedLogout,
  type AuthGenerationRequestMetadata,
} from "@/services/authSessionGeneration";

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
  const requestGeneration = getCurrentAuthGeneration();
  const token = await readStoredAuthToken();

  // A login or logout may have started while the token was being read.
  if (token && isCurrentAuthGeneration(requestGeneration)) {
    config.headers.Authorization = `Bearer ${token}`;
    // Axios keeps unknown config fields locally, so this is not an HTTP header.
    attachAuthGeneration(config as AuthGenerationRequestMetadata);
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
    const requestGeneration = (
      error.config as AuthGenerationRequestMetadata | undefined
    )?.__authGeneration;

    if (
      shouldStartUnauthorizedLogout(
        status,
        isLoginRequest,
        requestGeneration,
      )
    ) {
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
        await store.dispatch(logoutAuth(requestGeneration));
      } finally {
        finishUnauthorizedLogout(requestGeneration);
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
