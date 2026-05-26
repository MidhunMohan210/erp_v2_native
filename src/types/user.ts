export interface StaffUser {
  _id: string;
  name?: string;
  userName?: string;
  email?: string;
  mobileNumber?: string;
  role?: "admin" | "staff" | string;
}
