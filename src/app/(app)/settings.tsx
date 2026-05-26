import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DevResetButton } from "@/components/dev/DevResetButton";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: insets.bottom + 140 },
      ]}
      style={styles.container}
    >
      <Text style={styles.title}>Settings</Text>

      {__DEV__ ? (
        <View style={styles.devSection}>
          <Text style={styles.sectionLabel}>Developer Tools</Text>
          <DevResetButton />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 24,
  },
  devSection: {
    borderTopColor: "#d9d3c4",
    borderTopWidth: 1,
    marginTop: "auto",
    paddingTop: 24,
  },
  sectionLabel: {
    color: "#7a2e2e",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#28251d",
    fontSize: 24,
    fontWeight: "700",
  },
});
