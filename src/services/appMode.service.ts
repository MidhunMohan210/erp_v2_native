import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppMode = "online" | "offline";

// The key includes both identities so one company cannot inherit another's mode.
export function getAppModeStorageKey(userId: string, companyId: string): string {
  return `appMode.v1.${encodeURIComponent(JSON.stringify([userId, companyId]))}`;
}

// A missing value is a new context, so it starts in Online mode.
export async function readAppMode(userId: string, companyId: string): Promise<AppMode> {
  const saved = await AsyncStorage.getItem(getAppModeStorageKey(userId, companyId));
  return saved === "offline" ? "offline" : "online";
}

// Save only a confirmed mode choice. No transaction or master data lives here.
export async function saveAppMode(userId: string, companyId: string, mode: AppMode): Promise<void> {
  await AsyncStorage.setItem(getAppModeStorageKey(userId, companyId), mode);
}

// Phase 2B has no master download or completion marker. Offline must stay
// unavailable until a later phase can verify a complete company snapshot.
export async function hasCompleteOfflineMasterData(_userId: string, _companyId: string): Promise<boolean> {
  return false;
}
