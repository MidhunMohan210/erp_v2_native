import { zodResolver } from "@hookform/resolvers/zod";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  type LayoutChangeEvent,
  Alert,
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
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
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
import { uploadImageToCloudinary } from "@/utils/uploadCloudinary";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";

// ─── Schemas ─────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const YEAR_OPTIONS = Array.from({ length: 31 }, (_, index) => 2010 + index);

const getDefaultCompanyFormValues = (): CompanyFormInput => ({
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
});

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

type SelectorFieldProps = {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
  required?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
};

function SelectorField({
  label,
  value,
  placeholder,
  onPress,
  error,
  required = false,
  onLayout,
}: SelectorFieldProps) {
  return (
    <View className="mb-4" onLayout={onLayout}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Pressable
        onPress={onPress}
        className={`flex-row items-center justify-between rounded-2xl border bg-white px-4 py-3 ${
          error ? "border-rose-300" : "border-slate-200"
        }`}
      >
        <Text
          className={
            value ? "text-[15px] text-slate-900" : "text-[15px] text-slate-400"
          }
        >
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
      snapPoints={["70%"]}
      enableDynamicSizing={false}
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
      <View className="border-b border-slate-100 px-6 pb-4 pt-2">
        <Text className="mb-1 text-[11px] font-bold tracking-[0.2em] text-slate-400">
          SELECT
        </Text>
        <Text className="text-2xl font-semibold text-slate-900">{title}</Text>
      </View>

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
  required?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
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
  required = false,
  onLayout,
}: InputFieldProps) {
  return (
    <View className="mb-4" onLayout={onLayout}>
      <FieldLabel required={required}>{label}</FieldLabel>
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
        } ${multiline ? "min-h-[88px]" : ""} ${
          error ? "border-rose-300" : "border-slate-200"
        }`}
        placeholderTextColor="#94a3b8"
      />
      <FieldError message={error} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CompanyCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const companyIdParam = params.id;
  const companyId =
    typeof companyIdParam === "string" ? companyIdParam : companyIdParam?.[0];
  const isEditMode = Boolean(companyId);

  // KeyboardAwareScrollView exposes its scroll node through a callback ref,
  // so we store that node manually for scroll-to-error behavior.
  const formScrollRef = useRef<ScrollView | null>(null);
  const setFormScrollRef = (ref: ScrollView | null) => {
    formScrollRef.current = ref;
  };

  const fieldPositionsRef = useRef<Record<string, number>>({});

  const [logoAsset, setLogoAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const financialFormatSheetRef = useRef<BottomSheetModal>(null);
  const industrySheetRef = useRef<BottomSheetModal>(null);
  const countrySheetRef = useRef<BottomSheetModal>(null);
  const stateSheetRef = useRef<BottomSheetModal>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CompanyFormInput, undefined, CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: getDefaultCompanyFormValues(),
  });

  const companyQuery = useQuery({
    queryKey: [...QUERY_KEYS.companies, companyId],
    queryFn: () => companyService.getCompanyById(companyId as string),
    enabled: isEditMode && Boolean(companyId),
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

  // Prefer the freshly picked local image for preview, then fall back to the
  // uploaded URL already stored in the form.
  const effectiveLogoPreview = logoPreview || logoUrl || "";
  const normalizedCountry = selectedCountry?.trim().toLowerCase() ?? "";

  // Country metadata powers the currency autofill and the India-specific state selector.
  const countryMeta = useMemo(
    () =>
      COUNTRIES.find(
        (item) => item.countryName.trim().toLowerCase() === normalizedCountry,
      ) ?? null,
    [normalizedCountry],
  );

  const isIndia = normalizedCountry === "india";

  const financialYearFormatLabel =
    FINANCIAL_YEAR_FORMATS.find(
      (item) => item.value === selectedFinancialFormat,
    )?.label ?? "";

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const matchedFormat =
      FINANCIAL_YEAR_FORMATS.find(
        (item) => item.value === selectedFinancialFormat,
      ) ?? FINANCIAL_YEAR_FORMATS[0];

    // Keep hidden month values aligned with the selected financial year preset.
    setValue("financialYear.startMonth", matchedFormat.startMonth, {
      shouldValidate: true,
    });
    setValue("financialYear.endMonth", matchedFormat.endMonth, {
      shouldValidate: true,
    });
  }, [selectedFinancialFormat, setValue]);

  useEffect(() => {
    if (!countryMeta) return;

    // Store the canonical country record and refresh dependent currency fields together.
    setValue("country", countryMeta.countryName, { shouldValidate: true });
    setValue("currency", countryMeta.currency, { shouldValidate: true });
    setValue("currencyName", countryMeta.currencyName, {
      shouldValidate: true,
    });
    setValue("currencySymbol", countryMeta.symbol, { shouldValidate: true });
  }, [countryMeta, setValue]);

  useEffect(() => {
    if (!companyQuery.data) return;

    const company = companyQuery.data;
    const matchedFormat =
      FINANCIAL_YEAR_FORMATS.find(
        (item) => item.value === company.financialYear?.format,
      ) ?? FINANCIAL_YEAR_FORMATS[0];

    reset({
      name: company.name ?? "",
      flat: company.flat ?? "",
      road: company.road ?? "",
      place: company.place ?? "",
      landmark: company.landmark ?? "",
      pin: company.pin ?? "",
      country: company.country ?? "India",
      state: company.state ?? "Kerala",
      email: company.email ?? "",
      mobile: company.mobile ?? "",
      gstNum: company.gstNum ?? "",
      pan: company.pan ?? "",
      website: company.website ?? "",
      logo: company.logo ?? "",
      currency: company.currency ?? "INR",
      currencyName: company.currencyName ?? "Rupee",
      currencySymbol: company.currencySymbol ?? "Rs",
      industry: company.industry ?? "",
      financialYear: {
        format:
          matchedFormat.value as CompanyFormValues["financialYear"]["format"],
        startingYear:
          company.financialYear?.startingYear ?? new Date().getFullYear(),
        startMonth:
          company.financialYear?.startMonth ?? matchedFormat.startMonth,
        endMonth: company.financialYear?.endMonth ?? matchedFormat.endMonth,
      },
    });
    setLogoAsset(null);
    setLogoPreview("");
  }, [companyQuery.data, reset]);

  // ─── Mutation ──────────────────────────────────────────────────────────────

  const saveCompanyMutation = useMutation({
    mutationFn: (payload: CreateCompanyPayload) =>
      isEditMode && companyId
        ? companyService.updateCompany(companyId, payload)
        : companyService.createCompany(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace("/company");
    },
    onError: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(isEditMode ? "Company update failed." : "Company creation failed.");
    }
  });

  // ─── Logo handlers ─────────────────────────────────────────────────────────

  const handlePickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to choose a company logo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];
    // Match upload constraints here so users get fast feedback before upload starts.
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (asset.mimeType && !allowedTypes.includes(asset.mimeType)) {
      Alert.alert("Invalid image", "Please select a JPEG, PNG, or WebP image.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (asset.fileSize && asset.fileSize > maxSize) {
      Alert.alert("Image too large", "Image size should be less than 5MB.");
      return;
    }

    setLogoAsset(asset);
    setLogoPreview(asset.uri);
  };

  const handleUploadLogo = async () => {
    if (!logoAsset) {
      Alert.alert("No logo selected", "Please choose a logo image first.");
      return;
    }

    try {
      setLogoUploading(true);
      // Persist the uploaded URL into form state so submit uses a stable remote asset.
      const uploadedUrl = await uploadImageToCloudinary(logoAsset);
      setValue("logo", uploadedUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setLogoPreview(uploadedUrl);
      setLogoAsset(null);
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error ? error.message : "Logo upload failed.",
      );
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoAsset(null);
    setLogoPreview("");
    setValue("logo", "", { shouldDirty: true, shouldValidate: true });
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (values: CompanyFormValues) => {
    const selectedFormat =
      FINANCIAL_YEAR_FORMATS.find(
        (item) => item.value === values.financialYear.format,
      ) ?? FINANCIAL_YEAR_FORMATS[0];

    // Normalize outgoing strings at the boundary so the API receives trimmed values.
    await saveCompanyMutation.mutateAsync({
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
      type: companyQuery.data?.type ?? "integrated",
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

  // ─── Scroll-to-error ───────────────────────────────────────────────────────

  const registerFieldPosition =
    (fieldName: string) => (event: LayoutChangeEvent) => {
      fieldPositionsRef.current[fieldName] = event.nativeEvent.layout.y;
    };

  // React Hook Form nests object errors, so we walk the tree until we find the
  // first concrete field error with a message.
  const findFirstErrorField = (value: unknown, path = ""): string | null => {
    if (!value || typeof value !== "object") return null;

    for (const key of Object.keys(value as Record<string, unknown>)) {
      const nextPath = path ? `${path}.${key}` : key;
      const fieldError = (value as Record<string, unknown>)[key] as
        | Record<string, unknown>
        | undefined;

      if (
        fieldError &&
        typeof fieldError === "object" &&
        "message" in fieldError
      ) {
        return nextPath;
      }

      const nestedField = findFirstErrorField(fieldError, nextPath);
      if (nestedField) return nestedField;
    }

    return null;
  };

  const onError = () => {
    const firstErrorField = findFirstErrorField(errors);
    const y =
      firstErrorField != null
        ? fieldPositionsRef.current[firstErrorField]
        : undefined;

    // Scroll slightly above the invalid field so the label and error text stay visible.
    formScrollRef.current?.scrollTo({
      y: typeof y === "number" ? Math.max(y - 80, 0) : 0,
      animated: true,
    });
  };

  const errorCount = Object.keys(errors).length;
  const screenTitle = isEditMode ? "Edit Company" : "Create Company";
  const submitLabel = isEditMode ? "Save Changes" : "Create Company";
  const mutationErrorMessage = isEditMode
    ? "Unable to update company. Please try again."
    : "Unable to create company. Please try again.";

  if (companyQuery.isLoading) {
    return <PageLoader message="Loading company..." />;
  }

  if (companyQuery.isError) {
    return (
      <PageError
        title="Could not load company"
        description="We could not fetch the company details. Please try again."
        onRetry={() => void companyQuery.refetch()}
      />
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <ScreenHeader title={screenTitle} />

      {/*
       * innerRef expects a callback rather than a RefObject.
       * We use that callback to keep access to the underlying ScrollView
       * for validation-driven scrolling.
       */}
      <KeyboardAwareScrollView
        innerRef={setFormScrollRef}
        enableOnAndroid
        extraScrollHeight={110}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View className="mt-[-20px] px-4">
          <View className="bg-white p-4">
            <View className="mt-5">
              {/* Company Name */}
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
                    required
                    onLayout={registerFieldPosition("name")}
                  />
                )}
              />

              {/* Financial Year Starting Year */}
              <View
                onLayout={registerFieldPosition("financialYear.startingYear")}
              >
                <Controller
                  control={control}
                  name="financialYear.startingYear"
                  render={({ field: { value } }) => (
                    <InputField
                      label="Financial Year Starting (Year)"
                      value={value ? String(value) : ""}
                      onChangeText={() => undefined}
                      placeholder="Select financial year starting year"
                      editable={false}
                      error={errors.financialYear?.startingYear?.message?.toString()}
                      required
                    />
                  )}
                />
              </View>

              {/* Year chips */}
              <ScrollView
                horizontal
                className="mb-4"
                showsHorizontalScrollIndicator={false}
              >
                <View className="flex-row gap-2">
                  {YEAR_OPTIONS.map((year) => {
                    const isSelected = Number(selectedFinancialYear) === year;
                    return (
                      <Pressable
                        key={year}
                        onPress={() =>
                          setValue("financialYear.startingYear", year, {
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
                          className={`text-[13px] font-semibold ${
                            isSelected ? "text-[#134074]" : "text-slate-600"
                          }`}
                        >
                          {year}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Industry */}
              <SelectorField
                label="Industry"
                value={selectedIndustry}
                placeholder="Select industry"
                onPress={() => industrySheetRef.current?.present()}
                error={errors.industry?.message}
                required
                onLayout={registerFieldPosition("industry")}
              />

              {/* Financial Year Format */}
              <SelectorField
                label="Financial Year Format"
                value={financialYearFormatLabel}
                placeholder="Select financial year format"
                onPress={() => financialFormatSheetRef.current?.present()}
                required
                onLayout={registerFieldPosition("financialYear.format")}
              />

              {/* Flat */}
              <Controller
                control={control}
                name="flat"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Flat / Building"
                    value={value ?? ""}
                    onChangeText={onChange}
                    placeholder="Flat, floor, or building"
                    onLayout={registerFieldPosition("flat")}
                  />
                )}
              />

              {/* Road */}
              <Controller
                control={control}
                name="road"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Road"
                    value={value ?? ""}
                    onChangeText={onChange}
                    placeholder="Street or road"
                    onLayout={registerFieldPosition("road")}
                  />
                )}
              />

              {/* Place */}
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
                    required
                    onLayout={registerFieldPosition("place")}
                  />
                )}
              />

              {/* Landmark */}
              <Controller
                control={control}
                name="landmark"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Landmark"
                    value={value ?? ""}
                    onChangeText={onChange}
                    placeholder="Nearby landmark"
                    onLayout={registerFieldPosition("landmark")}
                  />
                )}
              />

              {/* PIN */}
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
                    required
                    onLayout={registerFieldPosition("pin")}
                  />
                )}
              />

              {/* Country */}
              <SelectorField
                label="Country"
                value={selectedCountry}
                placeholder="Select country"
                onPress={() => countrySheetRef.current?.present()}
                error={errors.country?.message}
                required
                onLayout={registerFieldPosition("country")}
              />

              {/* State */}
              {isIndia ? (
                <SelectorField
                  label="State"
                  value={selectedState}
                  placeholder="Select state"
                  onPress={() => stateSheetRef.current?.present()}
                  error={errors.state?.message}
                  required
                  onLayout={registerFieldPosition("state")}
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
                      required
                      onLayout={registerFieldPosition("state")}
                    />
                  )}
                />
              )}

              {/* Email */}
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
                    required
                    onLayout={registerFieldPosition("email")}
                  />
                )}
              />

              {/* Mobile */}
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
                    required
                    onLayout={registerFieldPosition("mobile")}
                  />
                )}
              />

              {/* Website */}
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
                    onLayout={registerFieldPosition("website")}
                  />
                )}
              />

              {/* GST / VAT */}
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
                    onLayout={registerFieldPosition("gstNum")}
                  />
                )}
              />

              {/* PAN */}
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
                    onLayout={registerFieldPosition("pan")}
                  />
                )}
              />

              {/* Logo */}
              <View className="mb-4">
                <FieldLabel>Company Logo</FieldLabel>

                {effectiveLogoPreview ? (
                  <View className="mb-3 flex-row items-center gap-3">
                    <View className="rounded-full border border-slate-200 bg-slate-50 p-1">
                      <Image
                        source={{ uri: effectiveLogoPreview }}
                        className="h-16 w-16 rounded-full"
                        resizeMode="contain"
                      />
                    </View>
                    <Pressable
                      onPress={handleRemoveLogo}
                      className="rounded-full bg-rose-50 px-3 py-2"
                    >
                      <Text className="text-[12px] font-semibold text-rose-500">
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="mb-3 h-16 w-16 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50">
                    <Text className="text-[11px] text-slate-400">Logo</Text>
                  </View>
                )}

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={handlePickLogo}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <Text className="text-[13px] font-semibold text-slate-700">
                      {effectiveLogoPreview ? "Change Logo" : "Choose Logo"}
                    </Text>
                  </Pressable>

                  {logoAsset ? (
                    <Pressable
                      onPress={handleUploadLogo}
                      disabled={logoUploading}
                      className={`rounded-2xl px-4 py-3 ${
                        logoUploading ? "bg-slate-300" : "bg-[#134074]"
                      }`}
                    >
                      <Text className="text-[13px] font-semibold text-white">
                        {logoUploading ? "Uploading..." : "Upload"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <FieldError message={errors.logo?.message} />
              </View>

              {/* Currency (auto-filled, read-only) */}
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
                    onLayout={registerFieldPosition("currency")}
                  />
                )}
              />

              {/* Currency Name */}
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
                    onLayout={registerFieldPosition("currencyName")}
                  />
                )}
              />

              {/* Currency Symbol */}
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
                    onLayout={registerFieldPosition("currencySymbol")}
                  />
                )}
              />

              {/* Mutation error */}
              {saveCompanyMutation.isError ? (
                <Text className="mb-4 text-sm text-rose-500">
                  {saveCompanyMutation.error instanceof Error
                    ? saveCompanyMutation.error.message
                    : mutationErrorMessage}
                </Text>
              ) : null}

              {/* Validation error summary */}
              {errorCount > 0 ? (
                <View className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <Text className="text-sm font-medium text-rose-600">
                    {`${errorCount} field${errorCount > 1 ? "s" : ""} need attention. Please review the form.`}
                  </Text>
                </View>
              ) : null}

              {/* Submit */}
              <Pressable
                onPress={handleSubmit(onSubmit, onError)}
                disabled={saveCompanyMutation.isPending}
                className={`mt-2 items-center rounded-2xl px-4 py-4 ${
                  saveCompanyMutation.isPending
                    ? "bg-slate-300"
                    : "bg-[#134074]"
                }`}
              >
                <Text className="text-[15px] font-bold text-white">
                  {saveCompanyMutation.isPending ? "Saving..." : submitLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* ─── Bottom Sheets ──────────────────────────────────────────────────── */}

      <SelectorSheet
        sheetRef={financialFormatSheetRef}
        title={`Financial Year Format${
          selectedFinancialYear ? ` • ${selectedFinancialYear}` : ""
        }`}
        options={FINANCIAL_YEAR_FORMATS.map((f) => f.label)}
        selectedValue={financialYearFormatLabel}
        onSelect={(label) => {
          const selectedFormat = FINANCIAL_YEAR_FORMATS.find(
            (f) => f.label === label,
          );
          if (!selectedFormat) return;
          setValue(
            "financialYear.format",
            selectedFormat.value as CompanyFormValues["financialYear"]["format"],
            { shouldDirty: true, shouldValidate: true },
          );
        }}
      />

      <SelectorSheet
        sheetRef={industrySheetRef}
        title="Industry"
        options={INDUSTRIES}
        selectedValue={selectedIndustry}
        onSelect={(industry) =>
          setValue("industry", industry, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />

      <SelectorSheet
        sheetRef={countrySheetRef}
        title="Country"
        options={COUNTRIES.map((c) => c.countryName)}
        selectedValue={selectedCountry}
        onSelect={(countryName) =>
          setValue("country", countryName, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />

      {isIndia ? (
        <SelectorSheet
          sheetRef={stateSheetRef}
          title="State"
          options={INDIA_STATES}
          selectedValue={selectedState}
          onSelect={(state) =>
            setValue("state", state, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      ) : null}
    </View>
  );
}
