import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ScrollText } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsNavRow } from "@/components/vouchers/VoucherUi";

export default function SettingsPrintConfigurationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Print Configuration" />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <SettingsNavRow
          title="Sale Order"
          icon={ScrollText}
          iconColor="#134074"
          onPress={() =>
            router.push("/settings-print-configuration-sale-order")
          }
        />
      </ScrollView>
    </View>
  );
}
