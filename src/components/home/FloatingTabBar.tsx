import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function FloatingTabBar() {
  return (
    <View className="absolute bottom-6 left-6 right-6 bg-white rounded-full shadow-xl shadow-gray-300 flex-row justify-between items-center px-2 py-2">
      {/* Active Tab */}
      <TouchableOpacity className="bg-[#334155] px-6 py-3 rounded-full flex-col items-center">
        <Feather name="home" size={20} color="white" />
        <Text className="text-white text-[10px] mt-1">Home</Text>
      </TouchableOpacity>

      {/* Inactive Tabs */}
      <TouchableOpacity className="px-4 py-2 flex-col items-center">
        <Feather name="briefcase" size={20} color="#64748b" />
        <Text className="text-slate-500 text-[10px] mt-1">Company</Text>
      </TouchableOpacity>

      <TouchableOpacity className="px-4 py-2 flex-col items-center">
        <Feather name="user" size={20} color="#64748b" />
        <Text className="text-slate-500 text-[10px] mt-1">Users</Text>
      </TouchableOpacity>

      <TouchableOpacity className="px-4 py-2 flex-col items-center">
        <Feather name="settings" size={20} color="#64748b" />
        <Text className="text-slate-500 text-[10px] mt-1">Settings</Text>
      </TouchableOpacity>
    </View>
  );
}