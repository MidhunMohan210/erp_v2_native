import { Redirect } from "expo-router";
import { Tabs } from "expo-router";
import { Home, Building2, Users, Settings } from "lucide-react-native";

import { useAppSelector } from "@/store/hooks";

export default function AppLayout() {
  const token = useAppSelector((state) => state.auth.token);

  // Protect all app routes
  if (!token) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#01696f",
        tabBarInactiveTintColor: "#7a7974",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#dcd9d5",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: "#f7f6f2",
        },
        headerTitleStyle: {
          fontWeight: "600",
          color: "#28251d",
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="company"
        options={{
          title: "Company",
          tabBarIcon: ({ color, size }) => (
            <Building2 color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}