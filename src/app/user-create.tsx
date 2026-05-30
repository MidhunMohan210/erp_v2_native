import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import axios from "axios";
import { toast } from "sonner-native";
import * as z from "zod";

import { ScreenHeader } from "@/components/ScreenHeader";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { userService, type StaffUserPayload } from "@/services/user.service";

// ─── Schema ───────────────────────────────────────────────────────────────────

const userSchema = z.object({
  userName: z.string().trim().min(1, "User name is required"),
  email: z.string().email("Invalid email"),
  mobileNumber: z
    .string()
    .trim()
    .min(7, "Mobile number is required")
    .regex(/^\d+$/, "Mobile number must contain digits only"),
  password: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultValues(): UserFormValues {
  return {
    userName: "",
    email: "",
    mobileNumber: "",
    password: "",
  };
}

function getPasswordError(
  password: string | undefined,
  isEditMode: boolean
): string {
  const value = String(password || "").trim();

  if (!isEditMode && !value) return "Password is required";
  if (!value) return "";
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(value)) return "Password needs one uppercase letter";
  if (!/[a-z]/.test(value)) return "Password needs one lowercase letter";
  if (!/\d/.test(value)) return "Password needs one number";
  if (!/[@$!%*?&]/.test(value)) return "Password needs one special character";

  return "";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({
  children,
  required = false,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <Text className="mb-2 text-[13px] font-semibold text-slate-700">
      {children}
      {required ? <Text className="text-rose-500"> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text className="mt-1.5 text-xs text-rose-500">{message}</Text>;
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
  secureTextEntry = false,
  showPasswordToggle = false,
  passwordVisible = false,
  onTogglePasswordVisibility,
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <View className="mb-4">
      <FieldLabel required={required}>{label}</FieldLabel>
      <View
        className={`rounded-2xl border ${
          editable ? "bg-white" : "bg-slate-100"
        } ${error ? "border-rose-300" : "border-slate-200"}`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          secureTextEntry={secureTextEntry}
          className="px-4 py-3 pr-12 text-[15px] text-slate-900"
          placeholderTextColor="#94a3b8"
        />
        {showPasswordToggle ? (
          <Pressable
            onPress={onTogglePasswordVisibility}
            className="absolute right-4 top-0 h-full items-center justify-center"
            hitSlop={10}
          >
            <Feather
              name={passwordVisible ? "eye-off" : "eye"}
              size={18}
              color="#64748b"
            />
          </Pressable>
        ) : null}
      </View>
      <FieldError message={error} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function UserCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const userIdParam = params.id;
  const userId =
    typeof userIdParam === "string" ? userIdParam : userIdParam?.[0];
  const isEditMode = Boolean(userId);

  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: getDefaultValues(),
  });

  // ─── Fetch user for edit mode ──────────────────────────────────────────────

  const userQuery = useQuery({
    queryKey: [...QUERY_KEYS.users, userId],
    queryFn: () => userService.getUserById(userId as string),
    enabled: isEditMode && Boolean(userId),
  });

  useEffect(() => {
    if (!userQuery.data) return;
    const user = userQuery.data;
    reset({
      userName: user.userName || user.name || "",
      email: user.email || "",
      mobileNumber: user.mobileNumber || "",
      password: "",
    });
  }, [reset, userQuery.data]);

  // ─── Save mutation ─────────────────────────────────────────────────────────

  const saveUserMutation = useMutation({
    mutationFn: (payload: StaffUserPayload) => {
      if (isEditMode && userId) {
        return userService.updateUser(userId, payload);
      }
      return userService.createStaff(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(isEditMode ? "User updated" : "User created");
      router.replace("/users");
    },
    onError: async (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "We could not save the user. Please try again.";

      toast.error(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  // ─── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = (values: UserFormValues) => {
    const passwordError = getPasswordError(values.password, isEditMode);
    if (passwordError) {
      setError("password", { message: passwordError });
      return;
    }

    const payload: StaffUserPayload = {
      userName: values.userName.trim(),
      email: values.email.trim(),
      mobileNumber: values.mobileNumber.trim(),
      role: "staff",
    };

    const password = String(values.password || "").trim();
    if (password) {
      payload.password = password;
    }

    saveUserMutation.mutate(payload);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title={isEditMode ? "Edit User" : "Create User"} showBack />

      {userQuery.isLoading ? (
        <PageLoader message="Loading user..." />
      ) : userQuery.isError ? (
        <PageError
          title="Could not load user"
          description="Please check the connection and try again."
          onRetry={() => void userQuery.refetch()}
        />
      ) : (
        // ✅ Bounded flex-1 container — gives real height for layout
        <View className="flex-1">

          {/* ✅ All form fields scroll inside here */}
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={100}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 24,
              paddingBottom: 16,
            }}
          >
            <Controller
              control={control}
              name="userName"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="User Name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter user name"
                  error={errors.userName?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="mobileNumber"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Mobile Number"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  error={errors.mobileNumber?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label={
                    isEditMode
                      ? "Password (leave blank to keep current)"
                      : "Password"
                  }
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder={
                    isEditMode ? "Enter new password" : "Create a password"
                  }
                  autoCapitalize="none"
                  secureTextEntry={!showPassword}
                  showPasswordToggle
                  passwordVisible={showPassword}
                  onTogglePasswordVisibility={() =>
                    setShowPassword((current) => !current)
                  }
                  error={errors.password?.message}
                  required={!isEditMode}
                />
              )}
            />
          </KeyboardAwareScrollView>

          {/* ✅ Button lives OUTSIDE ScrollView — always pinned to bottom */}
          <View
            className="border-t border-slate-100 bg-white px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={saveUserMutation.isPending}
              className={`items-center rounded-2xl px-4 py-4 ${
                saveUserMutation.isPending ? "bg-slate-300" : "bg-[#134074]"
              }`}
            >
              <Text className="text-[15px] font-bold text-white">
                {saveUserMutation.isPending
                  ? "Saving..."
                  : isEditMode
                    ? "Update User"
                    : "Create User"}
              </Text>
            </Pressable>
          </View>

        </View>
      )}
    </View>
  );
}
 