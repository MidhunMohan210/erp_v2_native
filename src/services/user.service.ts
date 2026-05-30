import api from "@/services/api";
import type { StaffUser } from "@/types/user";

export type StaffUserPayload = {
  userName: string;
  mobileNumber: string;
  email: string;
  role: string;
  password?: string;
};

export const userService = {
  createStaff: async (payload: StaffUserPayload) => {
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

  updateUser: async (id: string, payload: StaffUserPayload) => {
    const response = await api.put(`/api/users/staff/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/api/users/staff/${id}`);
  },
};
