import { Pressable, StyleSheet, Text, View } from "react-native";

type PageErrorProps = {
  description?: string;
  onRetry?: () => void;
  title?: string;
};

export function PageError({
  description = "Something went wrong while loading this screen.",
  onRetry,
  title = "Could not load page",
}: PageErrorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {onRetry ? (
          <Pressable onPress={onRetry} style={styles.button}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#134074",
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#fecaca",
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 340,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  container: {
    alignItems: "center",
    backgroundColor: "#f7f6f2",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  description: {
    color: "#64748b",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  title: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
});
