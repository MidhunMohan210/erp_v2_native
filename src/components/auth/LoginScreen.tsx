import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Eye, EyeOff, LockKeyhole, MailCheck } from "lucide-react-native";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { AuthFooter, AuthInput, PrimaryButton } from "./AuthFields";

const { width } = Dimensions.get("window");
const iconColor = "#1888df";
const mutedIconColor = "#64748b";

export function LoginScreen() {
  const router = useRouter();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardOpen(true);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardOpen(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 bg-white">
            {/* Blue header */}
            <View className="bg-[#1889df] px-8 pt-7">
              <View
                className={`h-6 w-6 items-center justify-center ${
                  keyboardOpen ? "mb-10" : "mb-[200px]"
                }`}
              ></View>

              <Text className="text-[42px] font-extrabold leading-[48px] tracking-[-1.5px] text-white">
                ERP
              </Text>

              <Text className="mt-1 text-2xl font-bold text-white">
                Sign in
              </Text>

              <Text
                className={`mt-3 w-[260px] text-sm leading-5 text-white/80 ${
                  keyboardOpen ? "mb-4" : "mb-8"
                }`}
              >
                Manage sales, stock, accounts, and daily business operations in
                one place.
              </Text>
            </View>

            {/* SVG curve transition */}
            <Svg
              width={width}
              height={80}
              viewBox={`0 0 ${width} 80`}
              style={{ marginTop: -1 }}
            >
              <Path
                d={`M0,0 H${width} V40 Q${width * 0.75},80 ${
                  width * 0.4
                },55 Q${width * 0.15},35 0,55 Z`}
                fill="#1889df"
              />
            </Svg>

            {/* White content */}
            <View className="flex-1 bg-white px-8 pt-6">
              <AuthInput
                autoCapitalize="none"
                icon={<MailCheck color={iconColor} size={20} strokeWidth={1.8} />}
                placeholder="Email or Mobile Number"
              />

              <AuthInput
                autoCapitalize="none"
                containerClassName="mt-[18px]"
                icon={<LockKeyhole color={iconColor} size={20} strokeWidth={1.8} />}
                rightIcon={
                  passwordVisible ? (
                    <EyeOff color={mutedIconColor} size={22} strokeWidth={1.8} />
                  ) : (
                    <Eye color={mutedIconColor} size={22} strokeWidth={1.8} />
                  )
                }
                rightIconAccessibilityLabel={
                  passwordVisible ? "Hide password" : "Show password"
                }
                onRightIconPress={() => setPasswordVisible((visible) => !visible)}
                placeholder="Password"
                secureTextEntry={!passwordVisible}
              />

              <Pressable className="mb-[66px] mt-4 items-end">
                <Text className="text-[13px] font-medium text-[#1689df]">
                  Forgot Password?
                </Text>
              </Pressable>

              <PrimaryButton className="mb-6">Login</PrimaryButton>

              <AuthFooter
                action="Sign Up"
                onPress={() => router.push("/signup")}
                prompt="Dont have an account?"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
