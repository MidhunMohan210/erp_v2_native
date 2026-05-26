import { ActivityIndicator, Text, View } from "react-native";

type PageLoaderProps = {
  message?: string;
};

export function PageLoader({
  message = "Loading, please wait...",
}: PageLoaderProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      {/* <View className="min-w-[220px] items-center rounded-3xl border border-slate-200 bg-white px-7 py-6"> */}
        <ActivityIndicator color="#134074" size="large" />
        <Text className="mt-[14px] text-center text-[15px] text-slate-600">{message}</Text>
      {/* </View> */}
    </View>
  );
}
