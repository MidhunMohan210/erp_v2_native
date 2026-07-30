import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Rows3 } from "lucide-react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsNavRow } from "@/components/vouchers/VoucherUi";

export default function SettingsDataEntryVoucherScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Voucher" />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <SettingsNavRow
          title="Voucher Series"
          icon={Rows3}
          iconColor="#134074"
          onPress={() => router.push("/settings-voucher-series")}
        />
      </ScrollView>
    </View>
  );
}
