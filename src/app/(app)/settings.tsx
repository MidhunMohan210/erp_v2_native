import { Alert, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Boxes, Keyboard, Printer, PlugZap, TestTube2 } from "lucide-react-native";
import { SettingsNavRow } from "@/components/vouchers/VoucherUi";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleSQLiteCheck = async () => {
    try {
      const { runSQLiteDevelopmentCheck } = await import(
        "@/offline/database/developmentCheck"
      );
      const result = await runSQLiteDevelopmentCheck();
      const persistence = result.persistenceMarkerFound
        ? "A marker from an earlier run was found. If you fully restarted the app, persistence passed."
        : "A marker was saved. Fully restart the app and run this check again to verify persistence.";
      Alert.alert("SQLite checks passed", `${result.passed.join("\n")}\n\n${persistence}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("SQLite development check failed", error);
      Alert.alert("SQLite check failed", message);
    }
  };

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
            iconColor="#134074"
            onPress={() => router.push("/settings-data-entry")}
          />
          <SettingsNavRow
            title="Print Configuration"
            icon={Printer}
            iconColor="#134074"
            onPress={() => router.push("/settings-print-configuration")}
          />
          <SettingsNavRow
            title="Stock Item"
            description="Tax and stock item master settings"
            icon={Boxes}
            iconColor="#134074"
            onPress={() => router.push("/settings-stock-item")}
          />
          <SettingsNavRow
            title="Integrations"
            icon={PlugZap}
            iconColor="#134074"
            onPress={() => router.push("/settings-integrations")}
          />
          {__DEV__ ? (
            <>
              <SettingsNavRow title="Sale Transaction Audit" icon={TestTube2} iconColor="#134074" onPress={() => router.push("/sale-transaction-audit")} />
              <SettingsNavRow title="Receipt Transaction Audit" icon={TestTube2} iconColor="#134074" onPress={() => router.push("/receipt-transaction-audit")} />
              <SettingsNavRow title="SQLite Foundation Check" icon={TestTube2} iconColor="#134074" onPress={handleSQLiteCheck} />
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
