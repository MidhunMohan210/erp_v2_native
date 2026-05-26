import { Pressable, Text, View } from "react-native";

type PageErrorProps = {
  description?: string;
  onRetry?: () => void;
  title?: string;
};

export function PageError({
  description = "Something went wrong while loading this screen.",
  onRetry,
  title = "Could not load page",
}: PageErrorProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6 ">
      <View className="w-full max-w-[340px] flex justify-center items-center ">
        <Text className="text-center text-[20px] font-bold text-[#0f172a]">{title}</Text>
        <Text className="mt-2 text-center text-[13px] leading-[22px] text-slate-500 max-w-[280px]">
          {description}
        </Text>

        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="mt-[18px] w-[50%] items-center rounded-[14px] bg-[#134074] px-[18px] py-3 active:opacity-90"
          >
            <Text className="text-[15px] font-bold text-white">Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
