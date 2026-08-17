import { Redirect, Tabs } from "expo-router";
import { Home, Building2, Users, Settings } from "lucide-react-native";
import { View, Platform, Pressable, Animated, Text } from "react-native";
import { useRef, useEffect } from "react";
import { PageLoader } from "@/components/feedback/PageLoader";
import { useAppSelector } from "@/store/hooks";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  primary: "#134074",
  primaryLight: "rgba(124, 58, 237, 0.13)",
  inactive: "#9e9b96",
};

const BOTTOM_OFFSET = Platform.select({ ios: 20, android: 25 }) as number;

type TabButtonProps = {
  icon: React.ComponentType<{ color: string; size: number; strokeWidth: number }>;
  label: string;
  isFocused: boolean;
  onPress: () => void;
};

function TabButton({ icon: Icon, label, isFocused, onPress }: TabButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 200,
        friction: 14,
      }),
      Animated.timing(pillOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: isFocused ? 1.1 : 1,
      useNativeDriver: true,
      tension: 200,
      friction: 12,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={null}
      className="flex-1 items-center justify-center py-2 gap-1"
    >
      <Animated.View
        style={{ transform: [{ scale }] }}
        className="items-center justify-center w-12 h-9 rounded-2xl"
      >
        {/* Animated violet pill — can't use className for animated opacity */}
        <Animated.View
          style={[
            {
              opacity: pillOpacity,
              backgroundColor: COLORS.primaryLight,
            },
          ]}
          className="absolute inset-0 rounded-2xl"
        />
        <Icon
          color={isFocused ? COLORS.primary : COLORS.inactive}
          size={21}
          strokeWidth={isFocused ? 2.4 : 1.8}
        />
      </Animated.View>

      <Text
        style={{ color: isFocused ? COLORS.primary : COLORS.inactive }}
        className="text-[10px] font-semibold tracking-tight"
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.select({
    ios: insets.bottom > 0 ? insets.bottom - 8 : BOTTOM_OFFSET,
    android: insets.bottom + 8,
  }) as number;

  const icons: Record<string, React.ComponentType<any>> = {
    home: Home,
    company: Building2,
    users: Users,
    settings: Settings,
  };

  const labels: Record<string, string> = {
    home: "Home",
    company: "Company",
    users: "Users",
    settings: "Settings",
  };

  return (
    <View
      style={{ bottom: bottomInset }}
      className="absolute left-5 right-5 mx36 bg-transparent"
      pointerEvents="box-none"
    >
      {/* iOS violet glow ring */}
      {Platform.OS === "ios" && (
        <View
          style={{
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 18,
          }}
          className="absolute -inset-1 rounded-[32px] bg-transparent"
        />
      )}

      {/* Bar */}
      <View
        className="flex-row w-full rounded-[28px] items-center justify-around px-2 border border-black/[0.06] overflow-hidden bg-transparent"
        style={{
          height: 68,
          backgroundColor:
            Platform.OS === "ios"
              ? "rgba(255, 255, 255, 0.92)"
              : "#ffffff",
          ...Platform.select({
            ios: {
              shadowColor: "#1a1714",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.12,
              shadowRadius: 28,
            },
            android: {
              elevation: 20,
            },
          }),
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const Icon = icons[route.name] ?? Home;
          const label = labels[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              icon={Icon}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function AppLayout() {
  const token = useAppSelector((state) => state.auth.token);
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading);

  if (isAuthLoading) {
    return <PageLoader message="Restoring session..." />;
  }

  if (!token) return <Redirect href="/(auth)/login" />;

  return (

    // <SafeAreaView style={{ flex: 1 }} >
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { fontWeight: "600", color: "#28251d" },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", headerShown: false }} />
      <Tabs.Screen name="company" options={{ title: "Company", headerShown: false }} />
      {/* <Tabs.Screen name="company-create" options={{ href: null, headerShown: false }} /> */}
      <Tabs.Screen name="users" options={{ title: "Users", headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: "Settings",headerShown: false }} />
    </Tabs>
    // </SafeAreaView>
  );
}
