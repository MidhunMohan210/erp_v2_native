import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

type CompanySwitchOverlayProps = {
  open: boolean;
  companyName?: string | null;
};

export default function CompanySwitchOverlay({
  open,
  companyName,
}: CompanySwitchOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent visible={open}>
      <View style={styles.backdrop}>
        <View style={styles.iconShell}>
          <View style={styles.iconBox}>
            <ActivityIndicator color="#94a3b8" size="small" />
          </View>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>Switching company...</Text>
          <Text style={styles.subtitle}>
            Preparing workspace for{" "}
            <Text style={styles.companyName}>
              {companyName || "the selected company"}
            </Text>
            .
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  companyName: {
    color: "#ffffff",
    fontWeight: "700",
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    width: 56,
  },
  iconShell: {
    justifyContent: "center",
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  textBlock: {
    marginTop: 16,
  },
  title: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
