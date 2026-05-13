import api from "@/services/api";

export const authService = {
  login: async (identifier: string, password: string) => {
    const res = await api.post("/api/auth/login", { identifier, password });
    return res.data;
  },

  register: async (name: string, email: string, password: string) => {
    const res = await api.post("/api/auth/register", { name, email, password });
    return res.data;
  },
};
