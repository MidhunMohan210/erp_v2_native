import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ReceiptText, ScrollText } from "lucide-react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsNavRow } from "@/components/vouchers/VoucherUi";

export default function SettingsVoucherSeriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Voucher Series" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        className="flex-1 px-4"
      >
        <SettingsNavRow
          title="Sale Order"
          icon={ScrollText}
          iconColor="#134074"
          onPress={() =>
            router.push({
              pathname: "/voucher-series-list",
              params: { voucherType: "saleOrder" },
            })
          }
        />

        <SettingsNavRow
          title="Receipt"
          icon={ReceiptText}
          iconColor="#134074"
          onPress={() =>
            router.push({
              pathname: "/voucher-series-list",
              params: { voucherType: "receipt" },
            })
          }
        />
      </ScrollView>
    </View>
  );
}
