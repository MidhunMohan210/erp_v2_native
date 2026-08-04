/*
 * Read the backend API URL from the project's .env file.
 *
 * Example:
 * EXPO_PUBLIC_API_URL=https://erpv2.camet.in
 */
const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/*
 * Stop the application immediately when the API URL is missing.
 *
 * Without this check, Axios may receive:
 * baseURL: undefined
 *
 * That would cause confusing network errors later.
 */
if (!baseUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is missing. Add it to the .env file.",
  );
}

/*
 * __DEV__ is true during development.
 * __DEV__ is false inside a release APK.
 *
 * During development, you may need an HTTP URL such as:
 * http://10.0.2.2:4000
 *
 * But a release APK must communicate through HTTPS.
 */
if (!__DEV__ && !baseUrl.startsWith("https://")) {
  throw new Error(
    "The production API URL must use HTTPS.",
  );
}

/*
 * Export the configuration so the same API URL can be used
 * throughout the application.
 */
export const CONFIG = {
  BASE_URL: baseUrl,
};