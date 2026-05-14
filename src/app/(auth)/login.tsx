import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Eye, EyeOff, LockKeyhole, MailCheck } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Dimensions, Platform, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Svg, { Path } from "react-native-svg";
import { useState } from "react";
import { AxiosError } from "axios";
import * as z from "zod";

import {
  AuthFooter,
  AuthInput,
  PrimaryButton,
} from "@/components/auth/AuthFields";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";

const { width } = Dimensions.get("window");
const iconColor = "#1888df";
const mutedIconColor = "#64748b";

// ── Schema ──────────────────────────────────────────────
const loginSchema = z.object({
  identifier: z.string().min(1, "Email or mobile number is required"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one symbol"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

type LoginResponse = {
  message: string;
  token: unknown;
  user: {
    _id: string;
    userName: string;
    mobileNumber: string;
    email: string;
    role: "admin" | "staff";
    subscription: string;
    owner: string | null;
    isBlocked: boolean;
    createdAt: string;
    updatedAt: string;
    user_id: string;
    __v: number;
  };
};

function extractAuthToken(token: unknown): string | null {
  if (typeof token === "string" && token.length > 0) {
    return token;
  }


  return null;
}

// ── Screen ───────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const loginMutation = useMutation<
    LoginResponse,
    AxiosError<{ message?: string }>,
    LoginFormValues
  >({
    mutationFn: ({ identifier, password }) =>
      authService.login(identifier, password),
    onSuccess: async (data) => {
      const token = extractAuthToken(data.token);
      if (!token) {
        throw new Error("Login succeeded but no valid token was returned.");
      }

      await setAuth(
        {
          _id: data.user._id,
          name: data.user.userName,
          email: data.user.email,
          role: data.user.role,
        },
        token
      );
      console.log("Login successful, token stored securely.");
      // router.replace("/(app)/dashboard");
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    await loginMutation.mutateAsync(data);
  };

  return (
    <View className="flex-1 bg-white">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 80}
      >
        <View className="flex-1 bg-white">
          {/* Blue header */}
          <View className="bg-[#1889df] px-8 pt-7">
            <View className="mb-[200px] h-6 w-6" />
            <Text className="text-[42px] font-extrabold leading-[48px] tracking-[-1.5px] text-white">
              ERP
            </Text>
            <Text className="mt-1 text-2xl font-bold text-white">Sign in</Text>
            <Text className="mb-8 mt-3 w-[260px] text-sm leading-5 text-white/80">
              Manage sales, stock, accounts, and daily business operations in
              one place.
            </Text>
          </View>

          {/* Wave SVG */}
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

          {/* Form */}
          <View className="flex-1 bg-white px-8 pt-6">

            {/* Identifier field */}
            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <AuthInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    icon={
                      <MailCheck color={iconColor} size={20} strokeWidth={1.8} />
                    }
                    placeholder="Email or Mobile Number"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                  />
                  {errors.identifier && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.identifier.message}
                    </Text>
                  )}
                </View>
              )}
            />

            {/* Password field */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="mt-[18px]">
                  <AuthInput
                    autoCapitalize="none"
                    icon={
                      <LockKeyhole
                        color={iconColor}
                        size={20}
                        strokeWidth={1.8}
                      />
                    }
                    rightIcon={
                      passwordVisible ? (
                        <EyeOff
                          color={mutedIconColor}
                          size={22}
                          strokeWidth={1.8}
                        />
                      ) : (
                        <Eye
                          color={mutedIconColor}
                          size={22}
                          strokeWidth={1.8}
                        />
                      )
                    }
                    rightIconAccessibilityLabel={
                      passwordVisible ? "Hide password" : "Show password"
                    }
                    onRightIconPress={() =>
                      setPasswordVisible((v) => !v)
                    }
                    placeholder="Password"
                    secureTextEntry={!passwordVisible}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                  />
                  {errors.password && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Pressable className="mb-[66px] mt-4 items-end">
              <Text className="text-[13px] font-medium text-[#1689df]">
                Forgot Password?
              </Text>
            </Pressable>

            {loginMutation.isError ? (
              <Text className="mb-4 text-center text-sm text-red-500">
                {loginMutation.error.response?.data?.message ??
                  loginMutation.error.message ??
                  "Unable to sign in. Please try again."}
              </Text>
            ) : null}

            <PrimaryButton
              className="mb-6"
              onPress={handleSubmit(onSubmit)}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </PrimaryButton>

            <AuthFooter
              action="Sign Up"
              onPress={() => router.push("/signup")}
              prompt="Don't have an account?"
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
