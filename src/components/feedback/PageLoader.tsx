import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type PageLoaderProps = {
  message?: string;
};

export function PageLoader({
  message = "Loading, please wait...",
}: PageLoaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator color="#134074" size="large" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 24,
    borderWidth: 1,
    minWidth: 220,
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  container: {
    alignItems: "center",
    backgroundColor: "#f7f6f2",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  message: {
    color: "#475569",
    fontSize: 15,
    marginTop: 14,
    textAlign: "center",
  },
});
