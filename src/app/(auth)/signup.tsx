import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AxiosError } from "axios";
import * as z from "zod";

import {
  AuthFooter,
  AuthInput,
  FieldLabel,
  PrimaryButton,
} from "@/components/auth/AuthFields";
import { authService } from "@/services/auth.service";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const iconColor = "#1888df";
const mutedIconColor = "#64748b";

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    mobileNumber: z
      .string()
      .trim()
      .min(10, "Mobile number must be at least 10 digits")
      .regex(/^\+?[0-9\s()-]+$/, "Enter a valid mobile number"),
    email: z.email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain at least one symbol"),
    confirmPassword: z.string(),
    acceptedTerms: z.boolean().refine((value) => value, {
      message: "You must accept the Terms and Conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

type RegisterResponse = {
  message: string;
  user: {
    id: string;
    userName: string;
    email: string;
    role: "admin" | "staff";
    subscription: string;
  };
};

export default function SignUpScreen() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      mobileNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  const registerMutation = useMutation<
    RegisterResponse,
    AxiosError<{ message?: string }>,
    SignUpFormValues
  >({
    mutationFn: ({ name, mobileNumber, email, password, confirmPassword }) =>
      authService.register({
        userName: name,
        mobileNumber,
        email,
        password,
        confirmPassword,
      }),
    onSuccess: () => {
      router.replace("/login");
    },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    await registerMutation.mutateAsync(data);
  };

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
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="mb-[13px]">
                    <FieldLabel>Name</FieldLabel>
                    <AuthInput
                      icon={<User color={iconColor} size={20} strokeWidth={1.8} />}
                      placeholder="Enter user name"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.name ? (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.name.message}
                      </Text>
                    ) : null}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="mobileNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="mb-[13px]">
                    <FieldLabel>Mobile Number</FieldLabel>
                    <AuthInput
                      icon={<Phone color={iconColor} size={20} strokeWidth={1.8} />}
                      keyboardType="phone-pad"
                      placeholder="Enter mobile number"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.mobileNumber ? (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.mobileNumber.message}
                      </Text>
                    ) : null}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="mb-[13px]">
                    <FieldLabel>Email</FieldLabel>
                    <AuthInput
                      autoCapitalize="none"
                      icon={<Mail color={iconColor} size={20} strokeWidth={1.8} />}
                      keyboardType="email-address"
                      placeholder="Enter email"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.email ? (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.email.message}
                      </Text>
                    ) : null}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
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
                      secureTextEntry={!passwordVisible}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.password ? (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.password.message}
                      </Text>
                    ) : null}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
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
                          <Eye
                            color={mutedIconColor}
                            size={22}
                            strokeWidth={1.8}
                          />
                        )
                      }
                      rightIconAccessibilityLabel={
                        confirmPasswordVisible
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      secureTextEntry={!confirmPasswordVisible}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.confirmPassword ? (
                      <Text className="mt-1 text-xs text-red-500">
                        {errors.confirmPassword.message}
                      </Text>
                    ) : null}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="acceptedTerms"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Pressable
                      className="mb-2 mt-3 flex-row items-center"
                      hitSlop={8}
                      onPress={() => onChange(!value)}
                    >
                      <View
                        className={`mr-3 h-5 w-5 items-center justify-center rounded-[4px] border ${
                          value
                            ? "border-[#1689df] bg-[#1689df]"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {value ? (
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
                    {errors.acceptedTerms ? (
                      <Text className="mb-4 text-xs text-red-500">
                        {errors.acceptedTerms.message}
                      </Text>
                    ) : (
                      <View className="mb-4" />
                    )}
                  </View>
                )}
              />

              <PrimaryButton
                className="mb-[13px] mt-1"
                disabled={registerMutation.isPending}
                loading={registerMutation.isPending}
                onPress={handleSubmit(onSubmit)}
              >
                Create an account
              </PrimaryButton>

              {registerMutation.isError ? (
                <Text className="mb-4 text-center text-sm text-red-500">
                  {registerMutation.error.response?.data?.message ??
                    registerMutation.error.message ??
                    "Unable to create account. Please try again."}
                </Text>
              ) : null}

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
