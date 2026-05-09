import Constants from "expo-constants";

export const CONFIG = {
  BASE_URL: Constants.expoConfig?.extra?.apiUrl as string,
};