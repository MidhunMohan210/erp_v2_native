import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function PrimaryActions() {
  const router = useRouter();

  return (
    <View className="flex-row justify-between mx-6 my-6">
      <TouchableOpacity
        onPress={() => router.push('/sale-order-create')}
        className="bg-sky-400 flex-1 rounded-2xl py-4 mr-2 items-center shadow-sm"
      >
        <Text className="text-white font-bold text-base">Create Order</Text>
      </TouchableOpacity>
      
      <TouchableOpacity className="bg-rose-500 flex-1 rounded-2xl py-4 ml-2 items-center shadow-sm">
        <Text className="text-white font-bold text-base">Create Receipt</Text>
      </TouchableOpacity>
    </View>
  );
}
