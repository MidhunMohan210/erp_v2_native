import { useRouter, type Href } from "expo-router";
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import CustomerIcon from "../../../assets/home/customer2.png";
import productsIcon from "../../../assets/home/products2.png";
import daybookIcon from "../../../assets/home/daybook.png";
import cashIcon from "../../../assets/home/cash2.png";
import outstandingIcon from "../../../assets/home/outstanding.png";


type QuickAction = {
  label: string;
  icon: ImageSourcePropType;
  iconBackgroundColor: string;
  to?: Href;
};

const quickActions: QuickAction[] = [

  {
    label: "Products",
    icon: productsIcon,
    iconBackgroundColor: "#FCE7F3",
    to: "/product-list",
  },
    {
    label: "Customers",
    icon: CustomerIcon,
    iconBackgroundColor: "#FEF9C3",
    to: "/customer-list",
  },
  {
    label: "Daybook",
    icon: daybookIcon,
    iconBackgroundColor: "#E0E7FF",
    to: "/daybook",
  },
  {
    label: "Outstanding",
    icon: outstandingIcon,
    iconBackgroundColor: "#FEE2E2",
  },
  {
    label: "Cash / Bank",
    icon: cashIcon,
    iconBackgroundColor: "#D1FAE5",
  },
];

export default function QuickActionsSheet() {
  const router = useRouter();

  return (
    <View className="mx-5 mt-5 rounded-2xl  p-4  ">
      <Text className="text-[16px] font-bold text-slate-800">Utilities</Text>

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
              
            >
              <Image
                source={action.icon}
                resizeMode="contain"
                className="h-11 w-11"
              />
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
