import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";

import type { AppDispatch } from "@/store";
import { clearAllStorage } from "@/utils/clearStorage";

export function DevResetButton() {
  const [isResetting, setIsResetting] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  if (!__DEV__) {
    return null;
  }

  const handleConfirmReset = () => {
    Alert.alert(
      "Reset App Storage",
      "This will clear all tokens, session data, and cached data. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            if (isResetting) {
              return;
            }

            setIsResetting(true);

            try {
              await clearAllStorage(dispatch);
              router.replace("/(auth)/login");
            } catch {
              Alert.alert(
                "Reset Failed",
                "The app could not clear local session data. Check the console logs and try again.",
              );
            } finally {
              setIsResetting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={isResetting}
        onPress={handleConfirmReset}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isResetting && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {isResetting ? "Resetting..." : "🔴 Reset App Storage"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#c62828",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    marginTop: 12,
  },
});
