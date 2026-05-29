import { zodResolver } from "@hookform/resolvers/zod";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as z from "zod";

import { ScreenHeader } from "@/components/ScreenHeader";
import {
  COUNTRIES,
  FINANCIAL_YEAR_FORMATS,
  INDIA_STATES,
  INDUSTRIES,
} from "@/constants/companyForm";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  companyService,
  type CreateCompanyPayload,
} from "@/services/company.service";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const financialYearSchema = z.object({
  format: z.enum([
    "april-march",
    "january-december",
    "february-january",
    "march-february",
    "may-april",
    "june-may",
    "july-june",
    "august-july",
    "september-august",
  ]),
  startingYear: z.coerce.number().min(1900).max(2999),
  startMonth: z.number().min(1).max(12),
  endMonth: z.number().min(1).max(12),
});

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  flat: z.string().optional(),
  road: z.string().optional(),
  place: z.string().trim().min(1, "Place is required"),
  landmark: z.string().optional(),
  pin: z.string().trim().min(3, "PIN is required"),
  country: z.string().trim().min(1, "Country is required"),
  state: z.string().trim().min(1, "State is required"),
  email: z.email("Invalid email"),
  mobile: z
    .string()
    .trim()
    .min(7, "Mobile is required")
    .regex(/^\d+$/, "Mobile must be digits"),
  gstNum: z.string().optional(),
  pan: z.string().optional(),
  website: z.string().optional(),
  currency: z.string().trim().min(1, "Currency is required"),
  currencyName: z.string().trim().min(1, "Currency name is required"),
  currencySymbol: z.string().trim().min(1, "Currency symbol is required"),
  logo: z.union([z.literal(""), z.url("Logo must be a valid URL")]),
  industry: z.string().trim().min(1, "Industry is required"),
  financialYear: financialYearSchema,
});

type CompanyFormValues = z.infer<typeof companySchema>;
type CompanyFormInput = z.input<typeof companySchema>;

const YEAR_OPTIONS = Array.from({ length: 31 }, (_, index) => 2010 + index);
const SELECTOR_SHEET_SNAP_POINTS = ["60%"];

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-[13px] font-semibold text-slate-700">
      {children}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <Text className="mt-1.5 text-xs text-rose-500">{message}</Text>;
}

type SelectorFieldProps = {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
};

function SelectorField({
  label,
  value,
  placeholder,
  onPress,
  error,
}: SelectorFieldProps) {
  return (
    <View className="mb-4">
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        onPress={onPress}
        className={`flex-row items-center justify-between rounded-2xl border bg-white px-4 py-3 ${
          error ? "border-rose-300" : "border-slate-200"
        }`}
      >
        <Text className={value ? "text-[15px] text-slate-900" : "text-[15px] text-slate-400"}>
          {value || placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color="#64748b" />
      </Pressable>
      <FieldError message={error} />
    </View>
  );
}

type SelectorSheetProps<TOption extends string> = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  title: string;
  options: TOption[];
  selectedValue?: string;
  onSelect: (value: TOption) => void;
};

function SelectorSheet<TOption extends string>({
  sheetRef,
  title,
  options,
  selectedValue,
  onSelect,
}: SelectorSheetProps<TOption>) {
  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["70%"]}                          // ✅ max 60%
      enableDynamicSizing={false}                   // ✅ must be false when using snapPoints
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 42 }}
      backgroundStyle={{ backgroundColor: "#f8fafc", borderRadius: 28 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.35}
        />
      )}
    >
      {/* ✅ Header outside scroll — fixed at top */}
      <View className="px-6 pt-2 pb-4 border-b border-slate-100">
        <Text className="mb-1 text-[11px] font-bold tracking-[0.2em] text-slate-400">
          SELECT
        </Text>
        <Text className="text-2xl font-semibold text-slate-900">
          {title}
        </Text>
      </View>

      {/* ✅ BottomSheetScrollView directly — no BottomSheetView wrapper */}
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
      >
        <View className="gap-3">
          {options.map((option) => {
            const isSelected = selectedValue === option;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  onSelect(option);
                  sheetRef.current?.dismiss();
                }}
                className={`rounded-3xl border px-4 py-4 ${
                  isSelected
                    ? "border-[#134074] bg-[#134074]/[0.08]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text
                    className={`flex-1 text-[15px] ${
                      isSelected
                        ? "font-semibold text-[#134074]"
                        : "text-slate-700"
                    }`}
                  >
                    {option}
                  </Text>
                  {isSelected ? (
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-[#134074]">
                      <Feather name="check" size={16} color="white" />
                    </View>
                  ) : (
                    <View className="h-8 w-8 items-center justify-center rounded-full border border-slate-200">
                      <Feather name="arrow-right" size={14} color="#64748b" />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "email-address"
    | "number-pad"
    | "phone-pad"
    | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  error?: string;
  multiline?: boolean;
};

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
  error,
  multiline = false,
}: InputFieldProps) {
  return (
    <View className="mb-4">
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-2xl border px-4 py-3 text-[15px] text-slate-900 ${
          editable ? "bg-white" : "bg-slate-100"
        } ${multiline ? "min-h-[88px]" : ""} ${error ? "border-rose-300" : "border-slate-200"}`}
        placeholderTextColor="#94a3b8"
      />
      <FieldError message={error} />
    </View>
  );
}

export default function CompanyCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const financialFormatSheetRef = useRef<BottomSheetModal>(null);
  const countrySheetRef = useRef<BottomSheetModal>(null);
  const stateSheetRef = useRef<BottomSheetModal>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CompanyFormInput, undefined, CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      flat: "",
      road: "",
      place: "",
      landmark: "",
      pin: "",
      country: "India",
      state: "Kerala",
      email: "",
      mobile: "",
      gstNum: "",
      pan: "",
      website: "",
      logo: "",
      currency: "INR",
      currencyName: "Rupee",
      currencySymbol: "Rs",
      industry: "",
      financialYear: {
        format: "april-march",
        startingYear: new Date().getFullYear(),
        startMonth: 4,
        endMonth: 3,
      },
    },
  });

  const selectedCountry = useWatch({ control, name: "country" });
  const selectedState = useWatch({ control, name: "state" });
  const selectedIndustry = useWatch({ control, name: "industry" });
  const selectedFinancialFormat = useWatch({
    control,
    name: "financialYear.format",
  });
  const logoUrl = useWatch({ control, name: "logo" });
  const selectedFinancialYear = useWatch({
    control,
    name: "financialYear.startingYear",
  });

  const normalizedCountry = selectedCountry?.trim().toLowerCase() ?? "";
  const countryMeta = useMemo(
    () =>
      COUNTRIES.find(
        (item) => item.countryName.trim().toLowerCase() === normalizedCountry,
      ) ?? null,
    [normalizedCountry],
  );

  const isIndia = normalizedCountry === "india";
  const financialYearFormatLabel =
    FINANCIAL_YEAR_FORMATS.find((item) => item.value === selectedFinancialFormat)
      ?.label ?? "";

  useEffect(() => {
    const matchedFormat =
      FINANCIAL_YEAR_FORMATS.find(
        (item) => item.value === selectedFinancialFormat,
      ) ?? FINANCIAL_YEAR_FORMATS[0];

    setValue("financialYear.startMonth", matchedFormat.startMonth, {
      shouldValidate: true,
    });
    setValue("financialYear.endMonth", matchedFormat.endMonth, {
      shouldValidate: true,
    });
  }, [selectedFinancialFormat, setValue]);

  useEffect(() => {
    if (!countryMeta) {
      return;
    }

    setValue("country", countryMeta.countryName, { shouldValidate: true });
    setValue("currency", countryMeta.currency, { shouldValidate: true });
    setValue("currencyName", countryMeta.currencyName, {
      shouldValidate: true,
    });
    setValue("currencySymbol", countryMeta.symbol, { shouldValidate: true });
  }, [countryMeta, setValue]);

  const createCompanyMutation = useMutation({
    mutationFn: (payload: CreateCompanyPayload) =>
      companyService.createCompany(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      router.replace("/company");
    },
  });

  const onSubmit = async (values: CompanyFormValues) => {
    const selectedFormat =
      FINANCIAL_YEAR_FORMATS.find(
        (item) => item.value === values.financialYear.format,
      ) ?? FINANCIAL_YEAR_FORMATS[0];

    await createCompanyMutation.mutateAsync({
      name: values.name.trim(),
      flat: values.flat?.trim(),
      road: values.road?.trim(),
      place: values.place.trim(),
      landmark: values.landmark?.trim(),
      pin: values.pin.trim(),
      country: values.country.trim(),
      state: values.state.trim(),
      email: values.email.trim(),
      mobile: values.mobile.trim(),
      gstNum: values.gstNum?.trim(),
      pan: values.pan?.trim(),
      website: values.website?.trim(),
      logo: values.logo?.trim(),
      type: "integrated",
      currency: values.currency.trim(),
      currencyName: values.currencyName.trim(),
      currencySymbol: values.currencySymbol.trim(),
      industry: values.industry.trim(),
      financialYear: {
        format: values.financialYear.format,
        startingYear: Number(values.financialYear.startingYear),
        startMonth: selectedFormat.startMonth,
        endMonth: selectedFormat.endMonth,
      },
    });
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <ScreenHeader title="Create Company" />
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={110}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 5 }} // ✅
      >
        <ScrollView
          className="flex-1 mt-[-20px]"
          // contentContainerStyle={{ paddingBottom: 75 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4 ">
            <View className=" bg-white p-4">
              <View className="mt-5">
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Company Name"
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter company name"
                      error={errors.name?.message}
                    />
                  )}
                />

                <View className="mb-4">
                  <FieldLabel>Financial Year Starting (Year)</FieldLabel>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {YEAR_OPTIONS.map((year) => (
                        <Controller
                          key={year}
                          control={control}
                          name="financialYear.startingYear"
                          render={({ field: { onChange, value } }) => {
                            const isSelected = Number(value) === year;
                            return (
                              <Pressable
                                onPress={() => onChange(year)}
                                className={`rounded-full border px-4 py-2 ${
                                  isSelected
                                    ? "border-[#134074] bg-[#e8f1fb]"
                                    : "border-slate-200 bg-white"
                                }`}
                              >
                                <Text
                                  className={`text-[13px] font-semibold ${
                                    isSelected
                                      ? "text-[#134074]"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {year}
                                </Text>
                              </Pressable>
                            );
                          }}
                        />
                      ))}
                    </View>
                  </ScrollView>
                  <FieldError
                    message={errors.financialYear?.startingYear?.message?.toString()}
                  />
                </View>

                <Controller
                  control={control}
                  name="industry"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Industry"
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter industry"
                      error={errors.industry?.message}
                    />
                  )}
                />

                <ScrollView
                  horizontal
                  className="mb-4"
                  showsHorizontalScrollIndicator={false}
                >
                  <View className="flex-row gap-2">
                    {INDUSTRIES.slice(0, 10).map((industry) => {
                      const isSelected = selectedIndustry === industry;
                      return (
                        <Pressable
                          key={industry}
                          onPress={() =>
                            setValue("industry", industry, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          className={`rounded-full border px-4 py-2 ${
                            isSelected
                              ? "border-[#134074] bg-[#e8f1fb]"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <Text
                            className={`text-[13px] ${
                              isSelected
                                ? "font-semibold text-[#134074]"
                                : "text-slate-600"
                            }`}
                          >
                            {industry}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                <SelectorField
                  label="Financial Year Format"
                  value={financialYearFormatLabel}
                  placeholder="Select financial year format"
                  onPress={() => financialFormatSheetRef.current?.present()}
                />

                <Controller
                  control={control}
                  name="flat"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Flat / Building"
                      value={value ?? ""}
                      onChangeText={onChange}
                      placeholder="Flat, floor, or building"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="road"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Road"
                      value={value ?? ""}
                      onChangeText={onChange}
                      placeholder="Street or road"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="place"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Place / City"
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter place or city"
                      error={errors.place?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="landmark"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Landmark"
                      value={value ?? ""}
                      onChangeText={onChange}
                      placeholder="Nearby landmark"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="pin"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="PIN / ZIP"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      placeholder="Enter PIN or ZIP"
                      error={errors.pin?.message}
                    />
                  )}
                />

                <SelectorField
                  label="Country"
                  value={selectedCountry}
                  placeholder="Select country"
                  onPress={() => countrySheetRef.current?.present()}
                  error={errors.country?.message}
                />

                {isIndia ? (
                  <SelectorField
                    label="State"
                    value={selectedState}
                    placeholder="Select state"
                    onPress={() => stateSheetRef.current?.present()}
                    error={errors.state?.message}
                  />
                ) : (
                  <Controller
                    control={control}
                    name="state"
                    render={({ field: { onChange, value } }) => (
                      <InputField
                        label="State"
                        value={value}
                        onChangeText={onChange}
                        placeholder="Enter state"
                        error={errors.state?.message}
                      />
                    )}
                  />
                )}

                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Email"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Enter email"
                      error={errors.email?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="mobile"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Mobile"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      placeholder="Enter mobile number"
                      error={errors.mobile?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="website"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Website"
                      value={value ?? ""}
                      onChangeText={onChange}
                      keyboardType="url"
                      autoCapitalize="none"
                      placeholder="www.example.com"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="gstNum"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label={isIndia ? "GST Number" : "VAT Number"}
                      value={value ?? ""}
                      onChangeText={onChange}
                      autoCapitalize="characters"
                      placeholder={
                        isIndia ? "Enter GST number" : "Enter VAT number"
                      }
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="pan"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="PAN"
                      value={value ?? ""}
                      onChangeText={onChange}
                      autoCapitalize="characters"
                      placeholder="Enter PAN"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="logo"
                  render={({ field: { onChange, value } }) => (
                    <InputField
                      label="Company Logo URL"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="url"
                      autoCapitalize="none"
                      placeholder="https://example.com/logo.png"
                      error={errors.logo?.message}
                    />
                  )}
                />

                {logoUrl ? (
                  <View className="mb-4 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <Image
                      source={{ uri: logoUrl }}
                      className="h-16 w-16 rounded-full"
                      resizeMode="contain"
                    />
                    <Text className="mt-2 text-[12px] text-slate-500">
                      Logo preview
                    </Text>
                  </View>
                ) : null}

                <Controller
                  control={control}
                  name="currency"
                  render={({ field: { value } }) => (
                    <InputField
                      label="Currency"
                      value={value}
                      onChangeText={() => undefined}
                      editable={false}
                      error={errors.currency?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="currencyName"
                  render={({ field: { value } }) => (
                    <InputField
                      label="Currency Name"
                      value={value}
                      onChangeText={() => undefined}
                      editable={false}
                      error={errors.currencyName?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="currencySymbol"
                  render={({ field: { value } }) => (
                    <InputField
                      label="Currency Symbol"
                      value={value}
                      onChangeText={() => undefined}
                      editable={false}
                      error={errors.currencySymbol?.message}
                    />
                  )}
                />

                {createCompanyMutation.isError ? (
                  <Text className="mb-4 text-sm text-rose-500">
                    {createCompanyMutation.error instanceof Error
                      ? createCompanyMutation.error.message
                      : "Unable to create company. Please try again."}
                  </Text>
                ) : null}

                <Pressable
                  onPress={handleSubmit(onSubmit)}
                  disabled={createCompanyMutation.isPending}
                  className={`mt-2 items-center rounded-2xl px-4 py-4 ${
                    createCompanyMutation.isPending
                      ? "bg-slate-300"
                      : "bg-[#134074]"
                  }`}
                >
                  <Text className="text-[15px] font-bold text-white">
                    {createCompanyMutation.isPending
                      ? "Saving..."
                      : "Create Company"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAwareScrollView>

      <SelectorSheet
        sheetRef={financialFormatSheetRef}
        title={`Financial Year Format${selectedFinancialYear ? ` • ${selectedFinancialYear}` : ""}`}
        options={FINANCIAL_YEAR_FORMATS.map((format) => format.label)}
        selectedValue={financialYearFormatLabel}
        onSelect={(label) => {
          const selectedFormat = FINANCIAL_YEAR_FORMATS.find(
            (format) => format.label === label,
          );

          if (!selectedFormat) {
            return;
          }

          setValue(
            "financialYear.format",
            selectedFormat.value as CompanyFormValues["financialYear"]["format"],
            {
              shouldDirty: true,
              shouldValidate: true,
            },
          );
        }}
      />

      <SelectorSheet
        sheetRef={countrySheetRef}
        title="Country"
        options={COUNTRIES.map((country) => country.countryName)}
        selectedValue={selectedCountry}
        onSelect={(countryName) => {
          setValue("country", countryName, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />

      {isIndia ? (
        <SelectorSheet
          sheetRef={stateSheetRef}
          title="State"
          options={INDIA_STATES}
          selectedValue={selectedState}
          onSelect={(state) => {
            setValue("state", state, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        />
      ) : null}
    </View>
  );
}
