import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthFooter, AuthInput, FieldLabel, PrimaryButton, SelectInput } from "./AuthFields";

export function SignUpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 bg-white"
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="min-h-screen flex-1 bg-white px-7 pt-7">
            <Pressable className="mb-6 h-6 w-6 items-center justify-center" hitSlop={10} onPress={() => router.back()}>
              <Text className="text-2xl leading-6 text-[#1689df]">‹</Text>
            </Pressable>

            <Text className="text-center text-[24px] font-bold text-slate-800">Create an Account</Text>
            <Text className="mx-auto mt-2 w-[280px] text-center text-[14px] leading-5 text-slate-400">
              Lorem dolor sit amet consectetur, adipising elit, sed do.
            </Text>

            <View className="mt-6">
              <View className="mb-[13px]">
                <FieldLabel>Full Name</FieldLabel>
                <AuthInput placeholder="Creative Jeff" />
              </View>

              <View className="mb-[13px]">
                <FieldLabel>Email</FieldLabel>
                <AuthInput autoCapitalize="none" keyboardType="email-address" placeholder="creativejeff@email.com" />
              </View>

              <View className="mb-[13px]">
                <FieldLabel>Password</FieldLabel>
                <AuthInput placeholder="••••••••" secureTextEntry />
              </View>

              <Text className="mb-[17px] mt-2 text-center text-[19px] font-bold text-slate-500">
                Personal information
              </Text>

              <View className="mb-[13px]">
                <FieldLabel>Date of Birth</FieldLabel>
                <AuthInput placeholder="09/05/1987" rightIcon="▣" />
              </View>

              <SelectInput label="Country/Region" value="United States" />
              <SelectInput label="State" value="California" />

              <View className="mb-[13px]">
                <FieldLabel>City</FieldLabel>
                <AuthInput placeholder="Roseville" />
              </View>

              <View className="mb-[13px]">
                <FieldLabel>Street</FieldLabel>
                <AuthInput placeholder="497 Berggren Rd." />
              </View>

              <PrimaryButton className="mb-[13px] mt-1">Continue</PrimaryButton>

              <AuthFooter
                action="Login"
                onPress={() => router.push("/login")}
                prompt="Already have an account?"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
