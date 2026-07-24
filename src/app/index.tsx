import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native-paper";
import { useAppSelector } from "@/store/hooks";
import { View } from "react-native";

export default function Index() {
  const token = useAppSelector((state) => state.auth.token);
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);

  // Wait until auth and company storage are read.
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
