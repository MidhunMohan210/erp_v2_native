import { View, Text } from 'react-native';

export default function BalanceCarousel() {
  return (
    <View className="bg-white/10 rounded-3xl mx-6 p-6 items-center border border-white/5">
      <Text className="text-white/70 text-xs font-bold tracking-widest mb-2">TOTAL BALANCE</Text>
      <Text className="text-white font-medium text-sm mb-1">Sale Order Total</Text>
      <Text className="text-white font-bold text-4xl mb-4">₹0.00</Text>
      <Text className="text-white/60 text-xs mb-4">Swipe to switch voucher total</Text>
      
      {/* Pagination Dots */}
      <View className="flex-row items-center space-x-2">
        <View className="w-6 h-1.5 bg-white rounded-full" />
        <View className="w-1.5 h-1.5 bg-white/40 rounded-full" />
      </View>
    </View>
  );
}