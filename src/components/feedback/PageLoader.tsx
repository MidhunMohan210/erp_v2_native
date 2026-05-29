import { ActivityIndicator, Text, View } from "react-native";

type PageLoaderProps = {
  message?: string;
};

export function PageLoader({
  message,
}: PageLoaderProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator color="#134074" size="large" />
      {message ? (
        <Text className="mt-3 text-[14px] text-slate-400">{message}</Text>
      ) : null}
    </View>
  );
}
