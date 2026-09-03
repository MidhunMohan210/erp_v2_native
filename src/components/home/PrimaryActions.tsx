import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from "@/components/ui/AppText";

export default function PrimaryActions() {
  const router = useRouter();

  return (
    <View className="mx-6 my-6">
      <View className="flex-row justify-between">
        <TouchableOpacity
          onPress={() => router.push('/sale-order-create')}
          className="mr-2 flex-1 items-center rounded-2xl bg-sky-400 py-4 shadow-sm"
        >
          <AppText numberOfLines={1} className="text-base font-bold text-white">
            Create Order
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/receipt-create')}
          className="ml-2 flex-1 items-center rounded-2xl bg-rose-500 py-4 shadow-sm"
        >
          <AppText numberOfLines={1} className="text-base font-bold text-white">
            Create Receipt
          </AppText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/sale-create')}
        className="mt-3 items-center rounded-2xl bg-[#134074] py-4 shadow-sm"
      >
        <AppText numberOfLines={1} className="text-base font-bold text-white">
          Create Sale
        </AppText>
      </TouchableOpacity>
    </View>
  );
}
