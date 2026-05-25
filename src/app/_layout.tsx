/* eslint-disable import/first */
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../../src/config/ReactotronConfig");
}

import "../../global.css";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Provider } from "react-redux";
import PaperProvider from "react-native-paper/lib/commonjs/core/PaperProvider";
import { MD3LightTheme } from "react-native-paper/lib/commonjs/styles/themes";

import { queryClient } from "@/lib/queryClient";
import { store } from "@/store";

// Custom theme using your ERP colors
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#01696f",
    background: "#f7f6f2",
    surface: "#ffffff",
    error: "#a12c7b",
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <BottomSheetModalProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </BottomSheetModalProvider>
          </PaperProvider>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
