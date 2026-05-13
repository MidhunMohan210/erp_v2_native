import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Check,
  CircleUserRound,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AuthFooter,
  AuthInput,
  FieldLabel,
  PrimaryButton,
} from "@/components/auth/AuthFields";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";


const iconColor = "#1888df";
const mutedIconColor = "#64748b";

export default function SignUpScreen() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
     <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={80}
        enableAutomaticScroll={true}
        extraHeight={120}
      >
        <ScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 36,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true} 
        >
          <View className="  bg-white px-7 pt-7">
            <Pressable
              className="mb-6 h-6 w-6 items-center justify-center"
              hitSlop={10}
              onPress={() => router.back()}
            >
              <Text className="text-2xl leading-6 text-[#1689df]">‹</Text>
            </Pressable>

            <View className="items-center">
              <CircleUserRound color="#1689df" size={52} strokeWidth={1.8} />
              <Text className="mt-5 text-center text-[24px] font-bold text-slate-800">
                Create an Account
              </Text>
              <Text className="mx-auto mt-2 w-[280px] text-center text-[14px] leading-5 text-slate-400">
                Start managing your sales, stock, and daily business operations.
              </Text>
            </View>

            <View className="mt-7">
              <View className="mb-[13px]">
                <FieldLabel>Name</FieldLabel>
                <AuthInput
                  icon={
                    <User
                      color={iconColor}
                      size={20}
                      strokeWidth={1.8}
                    />
                  }
                  placeholder="Enter user name"
                />
              </View>

              <View className="mb-[13px]">
                <FieldLabel>Mobile Number</FieldLabel>
                <AuthInput
                  icon={<Phone color={iconColor} size={20} strokeWidth={1.8} />}
                  keyboardType="phone-pad"
                  placeholder="Enter mobile number"
                />
              </View>

              <View className="mb-[13px]">
                <FieldLabel>Email</FieldLabel>
                <AuthInput
                  autoCapitalize="none"
                  icon={<Mail color={iconColor} size={20} strokeWidth={1.8} />}
                  keyboardType="email-address"
                  placeholder="Enter email"
                />
              </View>

              <View className="mb-[13px]">
                <FieldLabel>Password</FieldLabel>
                <AuthInput
                  icon={
                    <LockKeyhole
                      color={iconColor}
                      size={20}
                      strokeWidth={1.8}
                    />
                  }
                  onRightIconPress={() =>
                    setPasswordVisible((visible) => !visible)
                  }
                  placeholder="Enter password"
                  rightIcon={
                    passwordVisible ? (
                      <EyeOff
                        color={mutedIconColor}
                        size={22}
                        strokeWidth={1.8}
                      />
                    ) : (
                      <Eye color={mutedIconColor} size={22} strokeWidth={1.8} />
                    )
                  }
                  rightIconAccessibilityLabel={
                    passwordVisible ? "Hide password" : "Show password"
                  }
                  secureTextEntry={!passwordVisible}
                />
              </View>

              <View className="mb-[13px]">
                <FieldLabel>Confirm Password</FieldLabel>
                <AuthInput
                  icon={
                    <CircleUserRound
                      color={iconColor}
                      size={20}
                      strokeWidth={1.8}
                    />
                  }
                  onRightIconPress={() =>
                    setConfirmPasswordVisible((visible) => !visible)
                  }
                  placeholder="Confirm password"
                  rightIcon={
                    confirmPasswordVisible ? (
                      <EyeOff
                        color={mutedIconColor}
                        size={22}
                        strokeWidth={1.8}
                      />
                    ) : (
                      <Eye color={mutedIconColor} size={22} strokeWidth={1.8} />
                    )
                  }
                  rightIconAccessibilityLabel={
                    confirmPasswordVisible
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  secureTextEntry={!confirmPasswordVisible}
                />
              </View>

              <Pressable
                className="mb-6 mt-3 flex-row items-center"
                hitSlop={8}
                onPress={() => setAcceptedTerms((current) => !current)}
              >
                <View
                  className={`mr-3 h-5 w-5 items-center justify-center rounded-[4px] border ${
                    acceptedTerms
                      ? "border-[#1689df] bg-[#1689df]"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {acceptedTerms ? (
                    <Check color="#ffffff" size={14} strokeWidth={2.8} />
                  ) : null}
                </View>

                <Text className="text-[13px] text-slate-500">
                  I accept the{" "}
                  <Text className="font-extrabold text-[#1689df]">
                    Terms and Conditions
                  </Text>
                </Text>
              </Pressable>

              <PrimaryButton className="mb-[13px] mt-1">
                Create an account
              </PrimaryButton>

              <AuthFooter
                action="Login here"
                onPress={() => router.push("/login")}
                prompt="Already have an account?"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
