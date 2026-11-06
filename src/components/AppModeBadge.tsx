import { View } from "react-native";

import { useAppSelector } from "@/store/hooks";

import { AppText } from "./ui/AppText";

export function AppModeBadge() {
  // This label describes the user's selected app mode, not network connectivity.
  const mode = useAppSelector((state) => state.appMode.mode);
  const isOffline = mode === "offline";

  return (
    <View
      accessibilityLabel={`App mode: ${isOffline ? "Offline" : "Online"}`}
      className="shrink-0 flex-row items-center rounded-full bg-slate-100 px-2 py-1"
    >
      <View
        className={`mr-1.5 h-2 w-2 rounded-full ${isOffline ? "bg-amber-500" : "bg-emerald-500"}`}
      />
      <AppText className="text-[10px] font-bold text-slate-600">
        {isOffline ? "Offline" : "Online"}
      </AppText>
    </View>
  );
}
