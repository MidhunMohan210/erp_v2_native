// src/components/home/HomeHeader.tsx
import { View, Text, Pressable, Image } from "react-native";
import { LogOut } from "lucide-react-native";
import { useAppSelector } from "@/store/hooks";

export function HomeHeader() {
  const user = useAppSelector((state) => state.auth.user);
//   const company = useAppSelector((state) => state.company.selectedCompany);

  const handleLogout = () => {
    // TODO: Dispatch logout action
    console.log("Logout pressed");
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-blue-600"> 
      {/* Left: Profile Icon + Company Info */}
      <View className="flex-row items-center gap-3">
        {/* Profile Avatar */}
        <View className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center">
          <Text className="text-white text-lg font-semibold">
            {user?.name?.charAt(0).toUpperCase() || "M"}
          </Text>
        </View>

        {/* User Name + Company */}
        {/* <View>
          <Text className="text-base font-semibold text-gray-900">
            {user?.name || "Midhan"}
          </Text>
          <Pressable 
            onPress={() => console.log("Open company selector")}
            className="flex-row items-center gap-1"
          >
            <Text className="text-sm text-gray-600">
              {company?.name || "Test Com"}
            </Text>
            <Text className="text-gray-400">▼</Text>
          </Pressable>
        </View> */}
      </View>

      {/* Right: Logout Button */}
      <Pressable
        onPress={handleLogout}
        className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
      >
        <LogOut size={20} color="#6b7280" strokeWidth={2} />
      </Pressable>
    </View>
  );
}