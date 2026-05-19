import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function Header() {
  return (
    <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
      <View className="flex-row items-center">
        {/* Placeholder Avatar */}
        <View className="w-12 h-12 rounded-full bg-orange-400 items-center justify-center mr-3">
          <Text className="text-white font-bold text-lg">M</Text>
        </View>
        <View>
          <Text className="text-white font-bold text-lg">Midhun</Text>
          {/* Company selector omitted for now */}
        </View>
      </View>
      <TouchableOpacity>
        <Feather name="more-vertical" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}