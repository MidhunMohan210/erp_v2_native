// app/(app)/home.tsx
import { ScrollView } from "react-native";
import { HomeHeader } from "@/components/home/HomeHeader";

export default function Home() {
  return (
    <>
      <HomeHeader />
      <ScrollView className="flex-1 bg-gray-50">
        {/* Rest of your home content */}
      </ScrollView>
    </>
  );
}