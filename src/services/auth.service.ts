import api from "@/services/api";

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post("/api/auth/login", { email, password });
    return res.data;
  },

  register: async (name: string, email: string, password: string) => {
    const res = await api.post("/api/auth/register", { name, email, password });
    return res.data;
  },
};