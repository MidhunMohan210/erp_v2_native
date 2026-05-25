import * as SecureStore from "expo-secure-store";

import { queryClient } from "@/lib/queryClient";
import { clearSelectedCompany } from "@/store/companySlice";
import { resetAuth } from "@/store/authSlice";
import { store, type AppDispatch } from "@/store";
import { SECURE_KEYS } from "@/constants/storageKeys";

export async function clearAllSecureStorage(): Promise<void> {
  await Promise.all(
    SECURE_KEYS.map(async (key) => {
      await SecureStore.deleteItemAsync(key);
    }),
  );
}

export async function clearAllStorage(
  dispatch: AppDispatch = store.dispatch,
): Promise<void> {
  try {
    await clearAllSecureStorage();
    dispatch(resetAuth());
    dispatch(clearSelectedCompany());
    queryClient.clear();
    console.log(
      "[DevReset] Cleared secure storage, auth state, and TanStack Query cache.",
    );
  } catch (error) {
    console.error("[DevReset] Failed to clear app storage.", error);
    throw error;
  }
}
