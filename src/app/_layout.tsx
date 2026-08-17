/* eslint-disable import/first */
if (__DEV__) {
  require("../../src/config/ReactotronConfig");
}

import "../../global.css";
import { Stack, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReactQueryDevTools } from "@dev-plugins/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Provider as ReduxProvider } from "react-redux";
import { PaperProvider } from "react-native-paper";
import { DevToolsBubble } from "react-native-react-query-devtools";
import * as Clipboard from "expo-clipboard";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreHydration } from "@/components/store/StoreHydration";
import { store } from "@/store";
import { paperTheme } from "@/theme/paperTheme";
import { Toaster } from "sonner-native";
import { LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";

const queryClient = new QueryClient();

export default function RootLayout() {
  useReactQueryDevTools(queryClient);
  const pathname = usePathname();
  const isHome = pathname === "/home";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <StoreHydration />
          <QueryClientProvider client={queryClient}>
            <PaperProvider theme={paperTheme}>
              <BottomSheetModalProvider>
                <StatusBar style={isHome ? "light" : "dark"} />
                <Stack screenOptions={{ headerShown: false }} />
                <Toaster position="bottom-center" />
              </BottomSheetModalProvider>
            </PaperProvider>
            {__DEV__ && (
              <DevToolsBubble
                queryClient={queryClient}
                onCopy={Clipboard.setStringAsync}
              />
            )}
          </QueryClientProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
