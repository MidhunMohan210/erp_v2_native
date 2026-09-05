import { Redirect, Tabs, useRouter } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, Building2, Users, Settings, Plus } from "lucide-react-native";
import {
  View,
  Platform,
  Pressable,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { useRef, useEffect, useState } from "react";
import Svg, { Path } from "react-native-svg";
import { PageLoader } from "@/components/feedback/PageLoader";
import { useAppSelector } from "@/store/hooks";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  primary: "#134074",
  inactive: "#a9cdd5",
  surface: "#ffffff",
};

const BAR_HEIGHT = 72;
const CREATE_BUTTON_SIZE = 64;
const NOTCH_DEPTH = 38;
const NOTCH_HALF_WIDTH = 58;
const BAR_BOTTOM_RADIUS = 40;

// Builds a docked bar with a deep center notch and rounded lower corners.
function getNotchPath(width: number, height: number) {
  const centerX = width / 2;

  return `
    M 0,0
    L ${centerX - NOTCH_HALF_WIDTH},0
    C ${centerX - 38},0 ${centerX - 34},${NOTCH_DEPTH} ${centerX},${NOTCH_DEPTH}
    C ${centerX + 34},${NOTCH_DEPTH} ${centerX + 38},0 ${centerX + NOTCH_HALF_WIDTH},0
    L ${width},0
    L ${width},${height - BAR_BOTTOM_RADIUS}
    Q ${width},${height} ${width - BAR_BOTTOM_RADIUS},${height}
    L ${BAR_BOTTOM_RADIUS},${height}
    Q 0,${height} 0,${height - BAR_BOTTOM_RADIUS}
    L 0,0
    Z
  `;
}

type TabButtonProps = {
  icon: React.ComponentType<{
    color: string;
    size: number;
    strokeWidth: number;
  }>;
  isFocused: boolean;
  onPress: () => void;
};

type TabIcon = React.ComponentType<{
  color: string;
  size: number;
  strokeWidth: number;
}>;

function TabButton({ icon: Icon, isFocused, onPress }: TabButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused ? 1.08 : 1,
      useNativeDriver: true,
      tension: 200,
      friction: 14,
    }).start();
  }, [isFocused, scale]);

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
      toValue: isFocused ? 1.08 : 1,
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
      className="h-16 w-16 items-center justify-center"
    >
      <Animated.View
        style={{ transform: [{ scale }] }}
        className="h-12 w-12 items-center justify-center rounded-full"
      >
        <Icon
          color={isFocused ? COLORS.primary : COLORS.inactive}
          size={24}
          strokeWidth={isFocused ? 2.8 : 2.2}
        />
      </Animated.View>
    </Pressable>
  );
}

function CreateButton() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 12,
    }).start();
  };

  return (
    <View
      style={{
        position: "absolute",
        top: NOTCH_DEPTH - CREATE_BUTTON_SIZE,
        left: 0,
        right: 0,
      }}
      className="items-center"
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create sale order"
        onPress={() => router.push("/sale-order-create")}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={{
            width: CREATE_BUTTON_SIZE,
            height: CREATE_BUTTON_SIZE,
            transform: [{ scale }],
            ...Platform.select({
              ios: {
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
              },
              android: {
                elevation: 4,
              },
            }),
          }}
          className="items-center justify-center rounded-full bg-[#134074]"
        >
          <Plus color="#ffffff" size={30} strokeWidth={2.5} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const bottomSafeAreaHeight = insets.bottom;
  const dockedBarHeight = BAR_HEIGHT + bottomSafeAreaHeight;

  const icons: Record<string, TabIcon> = {
    home: Home,
    company: Building2,
    users: Users,
    settings: Settings,
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      style={{ bottom: 0 }}
      className="absolute left-0 right-0 items-center bg-transparent "
      pointerEvents="box-none"
    >
      {/* No shadow/elevation here anymore — no bounding-box mismatch */}
      <View
        onLayout={handleLayout}
        className="w-full rounded-3xl  "
        style={{ height: dockedBarHeight }}
      >
        {barWidth > 0 && (
          <Svg
            width={barWidth}
            height={dockedBarHeight + 16}
            style={{ position: "absolute", top: -8, left: 0 }}
          >
            <Path
              d={getNotchPath(barWidth, dockedBarHeight).replace(/\n/g, " ")}
              transform="translate(0, 8)"
              fill={
                Platform.OS === "ios"
                  ? "rgba(255, 255, 255, 0.98)"
                  : COLORS.surface
              }
              stroke="rgba(19, 64, 116, 0.10)"
              strokeWidth={1}
            />
          </Svg>
        )}

        <View
          className="flex-row items-center px-5  rounded-3xl "
          style={{ height: BAR_HEIGHT }}
        >
          <View className="flex-1 flex-row items-center justify-around pr-8 ">
            {state.routes.slice(0, 2).map((route, index) => {
              const isFocused = state.index === index;
              const Icon = icons[route.name] ?? Home;
              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented)
                  navigation.navigate(route.name);
              };
              return (
                <TabButton
                  key={route.key}
                  icon={Icon}
                  isFocused={isFocused}
                  onPress={onPress}
                />
              );
            })}
          </View>

          <View className="w-16" />

          <View className="flex-1 flex-row items-center justify-around pl-8">
            {state.routes.slice(2).map((route, index) => {
              const routeIndex = index + 2;
              const isFocused = state.index === routeIndex;
              const Icon = icons[route.name] ?? Home;
              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented)
                  navigation.navigate(route.name);
              };
              return (
                <TabButton
                  key={route.key}
                  icon={Icon}
                  isFocused={isFocused}
                  onPress={onPress}
                />
              );
            })}
          </View>

          <CreateButton />
        </View>
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
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { fontWeight: "600", color: "#28251d" },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", headerShown: false }}
      />
      <Tabs.Screen
        name="company"
        options={{ title: "Company", headerShown: false }}
      />
      <Tabs.Screen
        name="users"
        options={{ title: "Users", headerShown: false }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", headerShown: false }}
      />
    </Tabs>
  );
}
