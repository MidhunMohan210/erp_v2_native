import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

type AuthInputProps = TextInputProps & {
  icon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  rightIconAccessibilityLabel?: string;
  containerClassName?: string;
  inputClassName?: string;
};

export function AuthInput({
  icon,
  rightIcon,
  onRightIconPress,
  rightIconAccessibilityLabel,
  containerClassName = "",
  inputClassName = "",
  placeholderTextColor = "#9aa3ad",
  ...props
}: AuthInputProps) {
  const leftIconClasses = icon ? "rounded-sm border-0 border-b border-slate-200 pl-12 shadow-none" : "";
  const rightIconClasses = rightIcon ? "pr-10" : "";

  return (
    <View className={`justify-center ${containerClassName}`}>
      {icon ? (
        <View className="absolute left-[10px] z-10 h-5 w-5 items-center justify-center">
          {icon}
        </View>
      ) : null}
      <TextInput
        {...props}
        className={`min-h-[46px] rounded-[22px] border border-slate-100 bg-white px-4 py-3 text-[15px] text-slate-800 shadow-sm ${leftIconClasses} ${rightIconClasses} ${inputClassName}`}
        placeholderTextColor={placeholderTextColor}
      />
      {rightIcon ? (
        <Pressable
          accessibilityLabel={rightIconAccessibilityLabel}
          accessibilityRole={onRightIconPress ? "button" : undefined}
          className="absolute right-[14px] h-8 w-8 items-center justify-center"
          hitSlop={8}
          onPress={onRightIconPress}
        >
          {rightIcon}
        </Pressable>
      ) : null}
    </View>
  );
}

type SelectInputProps = {
  label: string;
  value: string;
};

export function SelectInput({ label, value }: SelectInputProps) {
  return (
    <View className="mb-[13px]">
      <FieldLabel>{label}</FieldLabel>
      <AuthInput editable={false} rightIcon={<Text className="text-lg text-slate-400">⌄</Text>} value={value} />
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text className="mb-2 text-[13px] font-medium text-slate-400">{children}</Text>;
}

export function PrimaryButton({
  children,
  onPress,
  className = "",
  disabled = false,
  loading = false,
}: {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      className={`min-h-[48px] items-center justify-center rounded-[22px] bg-[#1689df] shadow-lg active:translate-y-px active:opacity-80 ${
        disabled || loading ? "opacity-80" : ""
      } ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View className="flex-row items-center justify-center">
        {loading ? (
          <ActivityIndicator
            className="mr-2"
            color="#ffffff"
            size="small"
          />
        ) : null}
        <Text className="text-[14px] font-extrabold uppercase tracking-[0.2px] text-white">
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function AuthFooter({
  prompt,
  action,
  onPress,
}: {
  prompt: string;
  action: string;
  onPress?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-center mt-2 ">
      <Text className="text-[13px] text-slate-400">{prompt} </Text>
      <Pressable hitSlop={10} onPress={onPress}>
        <Text className="text-[13px] font-extrabold text-[#1689df]">{action}</Text>
      </Pressable>
    </View>
  );
}
