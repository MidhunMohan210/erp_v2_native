import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from "@/components/ui/AppText";

export default function PrimaryActions() {
  const router = useRouter();

  return (
    <View className="flex-row justify-between mx-6 my-6">
      <TouchableOpacity
        onPress={() => router.push('/sale-order-create')}
        className="bg-sky-400 flex-1 rounded-2xl py-4 mr-2 items-center shadow-sm"
      >
        <AppText numberOfLines={1} className="text-white font-bold text-base">Create Order</AppText>
      </TouchableOpacity>
      
      <TouchableOpacity 
      onPress={()=>router.push('/receipt-create')}
      className="bg-rose-500 flex-1 rounded-2xl py-4 ml-2 items-center shadow-sm">
        <AppText numberOfLines={1} className="text-white font-bold text-base">Create Receipt</AppText>
      </TouchableOpacity>
    </View>
  );
}
