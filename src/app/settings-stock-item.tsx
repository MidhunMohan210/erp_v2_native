import { ScrollView, View } from "react-native";
import { Tags } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsNavRow } from "@/components/vouchers/VoucherUi";

export default function StockItemSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Stock Item" />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        <SettingsNavRow
          title="Tax Classification"
          description="Manage HSN/SAC tax classifications"
          icon={Tags}
          iconColor="#134074"
          onPress={() => router.push("/tax-classification-list")}
        />
      </ScrollView>
    </View>
  );
}
