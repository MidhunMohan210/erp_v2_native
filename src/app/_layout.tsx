/* eslint-disable import/first */
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../../src/config/ReactotronConfig");
}

import "../../global.css";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import PaperProvider from "react-native-paper/lib/commonjs/core/PaperProvider";
import { MD3LightTheme } from "react-native-paper/lib/commonjs/styles/themes";

import { store } from "@/store";

const queryClient = new QueryClient();

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
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <Stack screenOptions={{ headerShown: false }} />
        </PaperProvider>
      </QueryClientProvider>
    </Provider>
  );
}
