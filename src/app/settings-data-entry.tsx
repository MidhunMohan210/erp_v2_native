import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FileText } from "lucide-react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsNavRow } from "@/components/vouchers/VoucherUi";

export default function SettingsDataEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Data Entry" />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <SettingsNavRow
          title="Voucher"
          icon={FileText}
          iconColor="#134074"
          onPress={() => router.push("/settings-data-entry-voucher")}
        />
      </ScrollView>
    </View>
  );
}
