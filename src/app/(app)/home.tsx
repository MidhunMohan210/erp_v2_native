import { View, ScrollView, StatusBar, ImageBackground } from 'react-native';
import Header from '@/components/home/Header';
import BalanceCarousel from '@/components/home/BalanceCarousel';
import PrimaryActions from '@/components/home/PrimaryActions';
import QuickActionsSheet from '@/components/home/QuickActionsSheet';
import homeBg from '../../../assets/home/homeBg.png'; 


export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Replace LinearGradient with ImageBackground */}
        <ImageBackground
          source={homeBg}
          resizeMode="cover"
          className="pb-10" // Adds extra space at the bottom for the white sheet to overlap
        >
          <Header />
          <BalanceCarousel />
          <PrimaryActions />
        </ImageBackground>

        {/* 
          We use a negative top margin (-mt-8) so the rounded corners 
          of the white sheet overlap the bottom of the image cleanly.
        */}
        <View className="-mt-8 bg-white flex-1 rounded-t-[40px]">
          <QuickActionsSheet />
        </View>

      </ScrollView>

      {/* <FloatingTabBar /> */}
    </View>
  );
}