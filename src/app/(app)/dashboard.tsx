import { Redirect } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { logoutAuth } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View className="flex-1 justify-center bg-slate-50 px-6">
      <View className="gap-3 rounded-3xl bg-white p-6 shadow-sm">
        <Text className="text-[32px] font-bold text-slate-900">
          Dashboard
        </Text>
        <Text className="text-lg text-slate-700">
          Signed in as {user?.name ?? "User"}.
        </Text>
        <Text className="leading-[22px] text-slate-500">
          This placeholder screen keeps the auth flow complete while the rest
          of the app shell is being built.
        </Text>
        <Pressable
          onPress={() => void dispatch(logoutAuth())}
          className="mt-2 self-start rounded-2xl border border-slate-300 px-4 py-3"
        >
          <Text className="font-medium text-slate-800">Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}
