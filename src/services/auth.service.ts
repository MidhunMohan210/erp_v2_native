import api from "@/services/api";

export const authService = {
  login: async (identifier: string, password: string) => {
    const res = await api.post("/api/auth/login", { identifier, password });
    return res.data;
  },

  register: async (payload: {
    userName: string;
    mobileNumber: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    const res = await api.post("/api/auth/register", payload);
    return res.data;
  },
};
