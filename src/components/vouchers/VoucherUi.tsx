import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ChevronRight, Settings2 } from "lucide-react-native";

type SectionCardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

type SettingsNavRowProps = {
  title: string;
  onPress: () => void;
  icon?: React.ComponentType<{
    color: string;
    size: number;
    strokeWidth: number;
  }>;
  iconColor?: string;
};

type PickerOption = {
  id: string;
  label: string;
  subtitle?: string;
};

type PickerProps = {
  title: string;
  searchValue: string;
  onSearchChange: (text: string) => void;
  searchPlaceholder: string;
  options: PickerOption[];
  selectedId?: string;
  emptyText: string;
  onSelect: (id: string) => void;
};

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  errorText?: string;
};

export function SectionCard({
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <View className="mb-4 rounded-[10px] border-none px-5 py-4">
      <Text className="text-[16px] font-extrabold text-[#17203a]">{title}</Text>
      {description ? (
        <Text className="mt-1 text-[13px] leading-5 text-slate-500">
          {description}
        </Text>
      ) : null}
      {children ? <View className="mt-4">{children}</View> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  extraStyles = "",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  extraStyles?: string;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`rounded-[14px] px-4 py-3 ${
        secondary ? "border border-slate-300 bg-white" : "bg-[#134074]"
      } ${disabled ? "opacity-50" : ""} ${extraStyles}`}
    >
      <Text
        className={`text-center text-[14px] font-bold ${
          secondary ? "text-slate-700" : "text-white"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  errorText,
}: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-2 text-[13px] font-semibold text-slate-700">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        className={`rounded-[14px] bg-white px-4 py-3 text-[14px] text-slate-900 ${errorText ? "border border-rose-400" : "border border-slate-300"}`}
        placeholderTextColor="#94a3b8"
      />
      {errorText ? (
        <Text className="mt-1 text-[12px] text-rose-500">{errorText}</Text>
      ) : null}
    </View>
  );
}

export function PickerList({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  options,
  selectedId,
  emptyText,
  onSelect,
}: PickerProps) {
  return (
    <View>
      <Text className="mb-2 text-[13px] font-semibold text-slate-700">
        {title}
      </Text>
      <TextInput
        value={searchValue}
        onChangeText={onSearchChange}
        placeholder={searchPlaceholder}
        className="rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-[14px] text-slate-900"
        placeholderTextColor="#94a3b8"
      />
      <View className="mt-3 rounded-[14px] border border-slate-200 bg-white">
        {options.length === 0 ? (
          <Text className="px-4 py-4 text-[13px] text-slate-500">
            {emptyText}
          </Text>
        ) : (
          options.map((option, index) => {
            const isSelected = selectedId === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() => onSelect(option.id)}
                className={`px-4 py-3 ${index !== options.length - 1 ? "border-b border-slate-100" : ""} ${isSelected ? "bg-blue-50" : "bg-white"}`}
              >
                <Text className="text-[14px] font-bold text-slate-900">
                  {option.label}
                </Text>
                {option.subtitle ? (
                  <Text className="mt-1 text-[12px] text-slate-500">
                    {option.subtitle}
                  </Text>
                ) : null}
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

export function SettingsNavRow({
  title,
  onPress,
  icon: Icon,
  iconColor,
}: SettingsNavRowProps) {
  const ResolvedIcon = Icon ?? Settings2;
  const resolvedIconColor = iconColor ?? "#94a3b8";

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-slate-200 bg-white py-5"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-50">
        <ResolvedIcon color={resolvedIconColor} size={22} strokeWidth={2.2} />
      </View>

      <Text className="ml-4 flex-1 text-[16px] font-medium text-[#111827]">
        {title}
      </Text>

      <ChevronRight color="#c4c7cf" size={22} strokeWidth={2.2} />
    </Pressable>
  );
}
