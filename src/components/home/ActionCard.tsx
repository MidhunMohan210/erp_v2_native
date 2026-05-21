import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ActionCardProps = {
  title: string;
  subtitle?: string;
  iconName: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string; // The solid circle background
  glowColors: readonly [string, string, ...string[]]; // The soft background glow
  type?: 'square' | 'horizontal-full' | 'horizontal-half';
};

export default function ActionCard({
  title,
  subtitle,
  iconName,
  iconColor,
  iconBgColor,
  glowColors,
  type = 'square',
}: ActionCardProps) {
  
  const isSquare = type === 'square';
  const widthClass = type === 'horizontal-full' ? 'w-full' : 'w-[48%]';
  const heightClass = isSquare ? 'h-36' : 'h-[72px]';

  return (
    <TouchableOpacity
      className={`${widthClass} ${heightClass} mb-4 rounded-3xl bg-white border border-gray-200 overflow-hidden shadow-lg `}
      // style={{
      //   shadowColor: '#000',
      //   shadowOffset: { width: 0, height: 2 },
      //   shadowOpacity: 0.05,
      //   shadowRadius: 8,
      //   elevation: 2,
      // }}
    >
      {/* The subtle glow effect in the top-left corner */}
      <View className="absolute top-0 left-0 right-0 bottom-0 opacity-40">
        <LinearGradient
          colors={glowColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-full h-full"
        />
      </View>

      <View className="flex-1 p-4 flex-col justify-between z-10">
        {isSquare ? (
          // Square Card Layout
          <>
            <View className={`w-11 h-11 rounded-full items-center justify-center ${iconBgColor}`}>
              <Feather name={iconName} size={20} color={iconColor} />
            </View>
            <View>
              <Text className="text-slate-800 font-semibold text-[15px]">{title}</Text>
              {subtitle && <Text className="text-slate-500 text-[11px] mt-0.5">{subtitle}</Text>}
              <Text className="text-slate-300 text-xs mt-1">...</Text>
            </View>
          </>
        ) : (
          // Horizontal Card Layout
          <View className="flex-row items-center justify-between h-full">
            <View className="flex-row items-center flex-1">
              <View className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${iconBgColor}`}>
                <Feather name={iconName} size={20} color={iconColor} />
              </View>
              <View>
                <Text className="text-slate-800 font-semibold text-[15px]">{title}</Text>
                {subtitle && <Text className="text-slate-500 text-[11px] mt-0.5">{subtitle}</Text>}
              </View>
            </View>
            <Text className="text-slate-300 text-xl mb-3">...</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}