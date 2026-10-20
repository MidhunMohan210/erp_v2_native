import { useRouter, type Href } from "expo-router";
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import CustomerIcon from "../../../assets/home/customer7.png";
import productsIcon from "../../../assets/home/product4.png";
import daybookIcon from "../../../assets/home/daybook3.png";
import cashIcon from "../../../assets/home/cashorbank2.png";
import outstandingIcon from "../../../assets/home/outstanding2.png";


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
    to: "/outstanding",
  },
  {
    label: "Cash / Bank",
    icon: cashIcon,
    iconBackgroundColor: "#D1FAE5",
    to: "/cash-bank",
  },
];

export default function QuickActionsSheet() {
  const router = useRouter();

  return (
    <View className="mx-2 mt-3 rounded-3xl p-3">
      <Text className="text-[16px] font-bold text-slate-800">Utilities</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerStyle={{ gap: 12, paddingRight: 12 }}
      >

        
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            className="w-[80px] items-center rounded-xl bg-gray-50 p-1.5"
            onPress={() => {
              if (action.to) router.push(action.to);
            }}
          >
            <View
              
            >
              <Image
                source={action.icon}
                resizeMode="contain"
                className="h-10 w-10"
              />
            </View>
            <Text
              className="mt-1.5 text-center text-[11px] font-medium text-slate-500"
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
