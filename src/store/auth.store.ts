import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
}

interface AuthStore {
  user: User | null;
  token: string | null;
  selectedCompany: string | null;
  setAuth: (user: User, token: string) => Promise<void>;
  setCompany: (companyId: string) => void;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  selectedCompany: null,

  setAuth: async (user, token) => {
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("Invalid auth token returned by login.");
    }

    await SecureStore.setItemAsync("token", token);
    await SecureStore.setItemAsync("user", JSON.stringify(user)); // ✅ stringify
    set({ user, token });
  },

  setCompany: (companyId) => {
    set({ selectedCompany: companyId });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user"); // ✅ clear user too
    set({ user: null, token: null, selectedCompany: null });
  },

  // ✅ call this on app startup to restore session
  rehydrate: async () => {
    const token = await SecureStore.getItemAsync("token");
    const userStr = await SecureStore.getItemAsync("user");
    if (token && userStr) {
      const user = JSON.parse(userStr); // ✅ parse back to object
      set({ user, token });
    }
  },
}));
