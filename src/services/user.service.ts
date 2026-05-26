import api from "@/services/api";
import type { StaffUser } from "@/types/user";

export const userService = {
  createStaff: async (payload: {
    userName: string;
    mobileNumber: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    const response = await api.post("/api/users/staff", payload);
    return response.data;
  },

  getUsers: async (): Promise<StaffUser[]> => {
    const response = await api.get<StaffUser[]>("/api/users/staff");
    return response.data || [];
  },

  getUserById: async (id: string): Promise<StaffUser> => {
    const response = await api.get<StaffUser>(`/api/users/staff/${id}`);
    return response.data;
  },
};
