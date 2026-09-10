export default {
  expo: {
    name: "erp_v2_app",
    slug: "erpv2app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "erpv2app",
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/expo.icon",
    },
    android: {
      package: "com.midhun_mohan.erpv2app",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      softwareKeyboardLayoutMode: "resize",
    },
    androidNavigationBar: {
      barStyle: "dark-content",
      backgroundColor: "#ffffff",
      enforceContrast: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-image",
      "expo-web-browser",
      "expo-dev-client",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76,
          },
        },
      ],
      "expo-secure-store",
      "expo-sharing",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "d7dd6b31-dc82-4f6d-8fbd-c21919adb16f",
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL, // ← added here
    },
    owner: "midhun_mohan",
  },
};
