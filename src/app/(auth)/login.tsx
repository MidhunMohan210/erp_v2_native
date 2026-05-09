import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

export default function LoginScreen() {
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailError =
    email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordError = password.length > 0 && password.length < 6;

  if (token) {
    return <Redirect href="/(app)/dashboard" />;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password to continue.");
      return;
    }

    if (emailError || passwordError) {
      setError("Fix the highlighted fields before signing in.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await authService.login(email.trim(), password);
      await setAuth(data.user, data.token);
      router.replace("/(app)/dashboard");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Login failed. Check your credentials and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View pointerEvents="none" className="absolute inset-0 bg-slate-950">
        <View className="absolute -right-10 -top-16 h-60 w-60 rounded-full bg-sky-500/30" />
        <View className="absolute -left-16 bottom-28 h-56 w-56 rounded-full bg-teal-400/20" />
        <View className="absolute left-0 right-0 top-[35%] h-px bg-white/10" />
        <View className="absolute bottom-0 top-0 left-[76%] w-px bg-white/5" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center gap-7 px-6 py-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-3">
            <View className="self-start rounded-full bg-white/10 px-4 py-2">
              <Text className="text-xs font-semibold tracking-[0.8px] text-sky-100">
                OPERATIONS SUITE
              </Text>
            </View>
            <Text className="text-[54px] font-bold leading-[58px] text-white">
              Welcome back
            </Text>
            <Text className="max-w-[440px] text-base leading-6 text-slate-200/80">
              Sign in to review stock, approvals, and daily business activity
              from one focused workspace.
            </Text>
          </View>

          <View className="w-full max-w-[480px] self-center rounded-[28px] bg-slate-50/95 p-[22px] shadow-sm">
            <Text className="text-[30px] font-bold text-slate-900">
              Login to ERP V2
            </Text>
            <Text className="mb-5 mt-2 text-[15px] leading-[22px] text-slate-600">
              Use your work account to continue into the dashboard.
            </Text>

            <View className="gap-4">
              <View>
                <Text className="mb-2 text-sm font-medium text-slate-700">
                  Email address
                </Text>
                <View
                  className={`rounded-2xl border bg-white px-4 py-1 ${
                    emailError ? "border-rose-500" : "border-slate-200"
                  }`}
                >
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="name@company.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    className="min-h-[52px] text-base text-slate-900"
                  />
                </View>
                {emailError ? (
                  <Text className="mt-2 text-sm text-rose-500">
                    Enter a valid email address.
                  </Text>
                ) : null}
              </View>

              <View>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-slate-700">
                    Password
                  </Text>
                  <Pressable onPress={() => setShowPassword((value) => !value)}>
                    <Text className="text-sm font-semibold text-sky-700">
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
                <View
                  className={`rounded-2xl border bg-white px-4 py-1 ${
                    passwordError ? "border-rose-500" : "border-slate-200"
                  }`}
                >
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    className="min-h-[52px] text-base text-slate-900"
                  />
                </View>
                {passwordError ? (
                  <Text className="mt-2 text-sm text-rose-500">
                    Password must be at least 6 characters.
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="mt-1 items-end">
              <Pressable>
                <Text className="text-sm font-semibold text-sky-700">
                  Forgot password?
                </Text>
              </Pressable>
            </View>

            {error ? (
              <Text className="mt-2 text-sm text-rose-500">
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={() => void handleLogin()}
              disabled={loading}
              className={`mt-3 min-h-[54px] items-center justify-center rounded-2xl ${
                loading ? "bg-sky-500/70" : "bg-sky-600"
              }`}
            >
              <Text className="text-base font-semibold text-white">
                {loading ? "Signing in..." : "Sign in"}
              </Text>
            </Pressable>

            {loading ? (
              <View className="mt-4 flex-row items-center justify-center gap-3">
                <ActivityIndicator color="#0369A1" />
                <Text className="text-sm text-slate-600">
                  Verifying your account
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
