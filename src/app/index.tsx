import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native-paper";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { rehydrateAuth } from "@/store/authSlice";
import { View } from "react-native";

export default function Index() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  useEffect(() => {
    void dispatch(rehydrateAuth());
  }, [dispatch]);

  // Wait until SecureStore is read
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
