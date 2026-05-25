// Keys intentionally wiped by the developer reset utility.
// Includes the requested auth/session keys plus legacy keys currently used
// in this app so a manual reset fully clears persisted sessions.
export const SECURE_KEYS: string[] = [
  "authToken",
  "refreshToken",
  "userId",
  "companyId",
  "userRole",
  "selectedCompany",
  "token",
  "user",
];

// No MMKV-backed session keys are currently used in this app.
export const MMKV_KEYS: string[] = [];
