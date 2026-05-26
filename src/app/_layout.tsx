/* eslint-disable import/first */
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../../src/config/ReactotronConfig");
}

import "../../global.css";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReactQueryDevTools } from "@dev-plugins/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Provider as ReduxProvider } from "react-redux";
import { PaperProvider } from "react-native-paper";
import { DevToolsBubble } from "react-native-react-query-devtools";
import * as Clipboard from "expo-clipboard"; // Needed for copying query data

import { store } from "@/store";
import { paperTheme } from "@/theme/paperTheme";

const queryClient = new QueryClient();

export default function RootLayout() {
  useReactQueryDevTools(queryClient);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={paperTheme}>
            <BottomSheetModalProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </BottomSheetModalProvider>
          </PaperProvider>
          {__DEV__ && <DevToolsBubble
           queryClient={queryClient}
           onCopy={Clipboard.setStringAsync} />}
        </QueryClientProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
