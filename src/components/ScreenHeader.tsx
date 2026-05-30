import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderMenu } from "@/components/headers/HeaderMenu";
import { HeaderSearchBar } from "@/components/headers/HeaderSearchBar";

type HeaderActionIcon = React.ComponentType<{
  color: string;
  size: number;
  strokeWidth: number;
}>;

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: ReactNode;
  rightExtra?: ReactNode;
  menuItems?: Array<{
    label: string;
    icon?: HeaderActionIcon;
    onPress: () => void;
    destructive?: boolean;
  }>;
  bottomContent?: ReactNode;
  bottomExtra?: ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;
}

export function ScreenHeader({
  title,
  showBack = true,
  onBack,
  rightContent,
  rightExtra,
  menuItems,
  bottomContent,
  bottomExtra,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View  className="bg-white px-4 pb-3" style={{ paddingTop: insets.top + 20 }}>
      <View className="mb-[14px] flex-row items-center justify-between">
        <View className="w-10">
          {showBack && (
            <Pressable
              hitSlop={10}
              onPress={onBack ?? (() => router.back())}
              className="h-8 w-8 items-center justify-center"
            >
              <ChevronLeft color="#2563eb" size={24} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>

        <Text className="text-[18px] font-extrabold text-[#17203a] text-center flex-1">
          {title}
        </Text>

        <View className="min-w-10 flex-row items-center justify-end">
          {rightContent ? (
            rightContent
          ) : menuItems ? (
            <View className="flex-row items-center">
              <HeaderMenu items={menuItems} />
              {rightExtra}
            </View>
          ) : (
            <View className="w-10" />
          )}
        </View>
      </View>

      {bottomContent ? (
        <View className="mt-2">
          {bottomContent}
        </View>
      ) : showSearch ? (
        <View className="mt-2">
          <HeaderSearchBar
            value={searchValue}
            onChange={onSearchChange ?? (() => undefined)}
            placeholder={searchPlaceholder}
          />
          {bottomExtra}
        </View>
      ) : null}
    </View>
  );
}
