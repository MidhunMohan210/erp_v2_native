import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface User  {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
};

interface AuthStore  {
  user: User | null;
  token: string | null;
  selectedCompany: string | null;
  setAuth: (user: User, token: string) => void;
  setCompany: (companyId: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  selectedCompany: null,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync("token", token);
    set({ user, token });
  },

  setCompany: (companyId) => {
    set({ selectedCompany: companyId });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("token");
    set({ user: null, token: null, selectedCompany: null });
  },
}));