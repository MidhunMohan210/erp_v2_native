import { View, ImageBackground } from "react-native";
import Header from "@/components/home/Header";
import BalanceCarousel from "@/components/home/BalanceCarousel";
import QuickActionsSheet from "@/components/home/QuickActionsSheet";
import { TodayTransactions } from "@/components/home/TodayTransactions";
import homeBg from "../../../assets/home/homeBg.png";


export default function HomeScreen() {
  return (
    <View  className="flex-1 bg-white">

      <ImageBackground
        source={homeBg}
        resizeMode="cover"
        className="pb-10 relative overflow-hidden"
      >
        {/* Black overlay */}
        <View className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <View className="relative z-10 py-7">
          <Header />
          <BalanceCarousel />
          {/* <PrimaryActions /> */}
        </View>
      </ImageBackground>

      <View
        className="-mt-8 flex-1 rounded-t-[20px] bg-white"
        style={{ minHeight: 0 }}
      >
        <QuickActionsSheet />
        <TodayTransactions />
      </View>
    </View>
  );
}
