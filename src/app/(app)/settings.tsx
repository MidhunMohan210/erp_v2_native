import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Keyboard, Printer, PlugZap } from "lucide-react-native";
import { SettingsNavRow } from "@/components/vouchers/VoucherUi";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Settings"  />

      <ScrollView
        className="flex-1 bg-white px-6 "
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 140,
        }}
      >
        <View className="">
          <SettingsNavRow
            title="Data Entry"
            icon={Keyboard}
            iconColor="#ec5a72"
            onPress={() => router.push("/settings-data-entry")}
          />
          <SettingsNavRow
            title="Print Configuration"
            icon={Printer}
            iconColor="#f2ab38"
            onPress={() => {}}
          />
          <SettingsNavRow
            title="Integrations"
            icon={PlugZap}
            iconColor="#5b8def"
            onPress={() => {}}
          />
        </View>
      </ScrollView>
    </View>
  );
}
