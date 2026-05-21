import { View, ScrollView, StatusBar, ImageBackground } from "react-native";
import Header from "@/components/home/Header";
import BalanceCarousel from "@/components/home/BalanceCarousel";
import QuickActionsSheet from "@/components/home/QuickActionsSheet";
import homeBg from "../../../assets/home/homeBg.png";
import PrimaryActions from "@/components/home/PrimaryActions";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
        <ImageBackground source={homeBg} resizeMode="cover" className="pb-10">
          <Header />
          <BalanceCarousel />
        <PrimaryActions/>
        </ImageBackground>

        <View className="-mt-8 bg-white flex-1 rounded-t-[40px]">
          <QuickActionsSheet />
        </View>
      </ScrollView>
    </View>
  );
}
