import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native-paper";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { rehydrateAuth } from "@/store/authSlice";
import { rehydrateSelectedCompany } from "@/store/companySlice";
import { View } from "react-native";

export default function Index() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);

  useEffect(() => {
    void Promise.all([
      dispatch(rehydrateAuth()),
      dispatch(rehydrateSelectedCompany()),
    ]);
  }, [dispatch]);

  // Wait until SecureStore is read
  if (isAuthLoading || isCompanyLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(app)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
