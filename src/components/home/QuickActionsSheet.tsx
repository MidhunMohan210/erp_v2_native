import { Feather } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

type QuickAction = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBackgroundColor: string;
  to?: Href;
};

const quickActions: QuickAction[] = [
  {
    label: "Customers",
    icon: "users",
    iconColor: "#CA8A04",
    iconBackgroundColor: "#FEF9C3",
    to: "/customer-list",
  },
  {
    label: "Products",
    icon: "box",
    iconColor: "#DB2777",
    iconBackgroundColor: "#FCE7F3",
    to: "/product-list",
  },
  {
    label: "Daybook",
    icon: "file-text",
    iconColor: "#4F46E5",
    iconBackgroundColor: "#E0E7FF",
    to: "/daybook",
  },
  {
    label: "Outstanding",
    icon: "alert-circle",
    iconColor: "#DC2626",
    iconBackgroundColor: "#FEE2E2",
  },
  {
    label: "Cash / Bank",
    icon: "dollar-sign",
    iconColor: "#059669",
    iconBackgroundColor: "#D1FAE5",
  },
];

export default function QuickActionsSheet() {
  const router = useRouter();

  return (
    <View className="mx-5 mt-5 rounded-2xl bg-white p-4 shadow-2xl">
      <Text className="text-[16px] font-bold text-slate-800">Service</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-4"
        contentContainerStyle={{ gap: 12, paddingRight: 12 }}
      >
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            className="w-[80px] items-center"
            onPress={() => {
              if (action.to) router.push(action.to);
            }}
          >
            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: action.iconBackgroundColor }}
            >
              <Feather name={action.icon} size={25} color={action.iconColor} />
            </View>
            <Text
              className="mt-2 text-center text-[11px] font-medium text-slate-500"
              numberOfLines={1}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
