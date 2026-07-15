import { zodResolver } from "@hookform/resolvers/zod";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isAxiosError } from "axios";
import * as Haptics from "expo-haptics";
import { Button, Dialog, Portal, Text as PaperText } from "react-native-paper";
import { toast } from "sonner-native";
import * as z from "zod";

import { ScreenHeader } from "@/components/ScreenHeader";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { COUNTRIES, INDIA_STATES } from "@/constants/companyForm";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  partyQueryKeys,
  useAccountGroupListQuery,
  usePartyByIdQuery,
  useSubGroupListQuery,
} from "@/hooks/queries/partyQueries";
import { partyService } from "@/services/party.service";
import { useAppSelector } from "@/store/hooks";
import type { CreatePartyPayload, Party } from "@/types/party";

const customerSchema = z.object({
  partyName: z.string().trim().min(1, "Party name is required"),
  partyType: z.enum(["party", "bank", "cash"]),
  accountGroup: z.string().trim().min(1, "Account group is required"),
  subGroup: z.string().optional(),
  mobileNumber: z.string().optional(),
  emailID: z.union([z.literal(""), z.string().trim().email("Invalid email")]),
  gstNo: z.string().optional(),
  panNo: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  creditPeriod: z.string().optional(),
  creditLimit: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  pin: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

type SelectorOption = {
  label: string;
  value: string;
};

const PARTY_TYPE_OPTIONS: SelectorOption[] = [
  { label: "Party", value: "party" },
  { label: "Bank", value: "bank" },
  { label: "Cash", value: "cash" },
];

const COUNTRY_OPTIONS: SelectorOption[] = COUNTRIES.map((country) => ({
  label: country.countryName,
  value: country.countryName,
}));

const STATE_OPTIONS: SelectorOption[] = INDIA_STATES.map((state) => ({
  label: state,
  value: state,
}));

function getDefaultValues(): CustomerFormValues {
  return {
    partyName: "",
    partyType: "party",
    accountGroup: "",
    subGroup: "",
    mobileNumber: "",
    emailID: "",
    gstNo: "",
    panNo: "",
    billingAddress: "",
    shippingAddress: "",
    creditPeriod: "",
    creditLimit: "",
    country: "India",
    state: "Kerala",
    pin: "",
  };
}

function getLookupId(
  value:
    | string
    | { _id?: string; id?: string }
    | null
    | undefined,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
}

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
  error,
  multiline = false,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "email-address"
    | "number-pad"
    | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  error?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <View className="mb-4">
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

function SelectorField({
  label,
  value,
  placeholder,
  onPress,
  error,
  required = false,
  disabled = false,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <View className="mb-4">
      <FieldLabel required={required}>{label}</FieldLabel>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
          disabled ? "bg-slate-100" : "bg-white"
        } ${error ? "border-rose-300" : "border-slate-200"}`}
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

function SelectorSheet({
  sheetRef,
  title,
  options,
  selectedValue,
  onSelect,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  title: string;
  options: SelectorOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}) {
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
            const isSelected = selectedValue === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
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
                    {option.label}
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

export default function CustomerCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);

  const partyIdParam = params.id;
  const partyId =
    typeof partyIdParam === "string" ? partyIdParam : partyIdParam?.[0];
  const isEditMode = Boolean(partyId);
  const cmp_id = selectedCompany?._id ?? "";
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);

  const partyTypeSheetRef = useRef<BottomSheetModal>(null);
  const accountGroupSheetRef = useRef<BottomSheetModal>(null);
  const subGroupSheetRef = useRef<BottomSheetModal>(null);
  const countrySheetRef = useRef<BottomSheetModal>(null);
  const stateSheetRef = useRef<BottomSheetModal>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: getDefaultValues(),
  });

  const selectedPartyType = useWatch({ control, name: "partyType" });
  const watchedCountry = useWatch({ control, name: "country" });
  const watchedAccountGroup = useWatch({ control, name: "accountGroup" });
  const selectedSubGroup = useWatch({ control, name: "subGroup" });
  const selectedState = useWatch({ control, name: "state" });

  const partyQuery = usePartyByIdQuery(partyId || "", isEditMode);
  const accountGroupsQuery = useAccountGroupListQuery(cmp_id, Boolean(cmp_id));
  const subGroupsQuery = useSubGroupListQuery(
    cmp_id,
    watchedAccountGroup || "",
    Boolean(cmp_id) && Boolean(watchedAccountGroup),
  );

  const isIndia = (watchedCountry || "") === "India";
  const isTallyParty = isEditMode && partyQuery.data?.source === "tally";

  useEffect(() => {
    if (!partyQuery.data) return;

    const party: Party = partyQuery.data;
    reset({
      partyName: party.partyName || "",
      partyType:
        party.partyType === "bank" || party.partyType === "cash"
          ? party.partyType
          : "party",
      accountGroup: getLookupId(party.accountGroup),
      subGroup: getLookupId(party.subGroup),
      mobileNumber: party.mobileNumber || "",
      emailID: party.emailID || "",
      gstNo: party.gstNo || "",
      panNo: party.panNo || "",
      billingAddress: party.billingAddress || "",
      shippingAddress: party.shippingAddress || "",
      creditPeriod: party.creditPeriod || "",
      creditLimit: party.creditLimit || "",
      country: party.country || "India",
      state: party.state || "Kerala",
      pin: party.pin || "",
    });
  }, [partyQuery.data, reset]);

  const accountGroupOptions = useMemo(
    () =>
      (accountGroupsQuery.data ?? []).map((group) => ({
        label: group.accountGroup,
        value: group._id,
      })),
    [accountGroupsQuery.data],
  );

  const subGroupOptions = useMemo(
    () =>
      (subGroupsQuery.data ?? []).map((group) => ({
        label: group.subGroup,
        value: group._id,
      })),
    [subGroupsQuery.data],
  );

  const selectedAccountGroupLabel = useMemo(
    () =>
      accountGroupOptions.find((option) => option.value === watchedAccountGroup)
        ?.label || "",
    [accountGroupOptions, watchedAccountGroup],
  );
  const hasAccountGroups = accountGroupOptions.length > 0;
  const selectedCountryLabel = watchedCountry || "";

  const savePartyMutation = useMutation({
    mutationFn: (payload: CreatePartyPayload) => {
      if (isEditMode && partyId) {
        return partyService.updateParty(partyId, payload);
      }
      return partyService.createParty(payload);
    },
    onSuccess: async (data) => {
      if (partyId) {
        queryClient.setQueryData(
          partyQueryKeys.detail(partyId),
          data?.party ?? partyQuery.data,
        );
      }

      router.replace("/customer-list");

      void queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === QUERY_KEYS.parties[0] &&
          query.queryKey[1] !== "detail",
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(
        data?.message || (isEditMode ? "Customer updated" : "Customer created"),
      );
    },
    onError: async (error) => {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "We could not save the customer. Please try again.";

      toast.error(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const deletePartyMutation = useMutation({
    onMutate: async () => {
      if (!partyId) {
        return;
      }

      await queryClient.cancelQueries({
        queryKey: partyQueryKeys.detail(partyId),
        exact: true,
      });
    },
    mutationFn: () => partyService.deleteParty(partyId as string),
    onSuccess: async (data) => {
      setIsDeleteDialogVisible(false);
      if (partyId) {
        queryClient.removeQueries({
          queryKey: partyQueryKeys.detail(partyId),
          exact: true,
        });
      }

      router.replace("/customer-list");

      void queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === QUERY_KEYS.parties[0] &&
          query.queryKey[1] !== "detail",
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(data?.message || "Customer deleted");
    },
    onError: async (error) => {
      setIsDeleteDialogVisible(false);
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "We could not delete the customer. Please try again.";

      toast.error(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const onSubmit = (values: CustomerFormValues) => {
    if (!cmp_id) {
      toast.error("Select a company first");
      return;
    }

    if (isTallyParty) {
      toast.error("Tally customers cannot be edited");
      return;
    }

    const payload: CreatePartyPayload = {
      cmp_id,
      partyName: values.partyName.trim(),
      partyType: "party",
      accountGroup: values.accountGroup,
      subGroup: (values.subGroup || "").trim(),
      mobileNumber: values.mobileNumber.trim(),
      emailID: (values.emailID || "").trim(),
      gstNo: (values.gstNo || "").trim(),
      panNo: (values.panNo || "").trim(),
      billingAddress: (values.billingAddress || "").trim(),
      shippingAddress: (values.shippingAddress || "").trim(),
      creditPeriod: (values.creditPeriod || "").trim(),
      creditLimit: (values.creditLimit || "").trim(),
      openingBalanceType: "dr",
      openingBalanceAmount: 0,
      country: (values.country || "").trim(),
      state: (values.state || "").trim(),
      pin: (values.pin || "").trim(),
    };

    savePartyMutation.mutate(payload);
  };

  const handleDeleteCustomer = () => {
    if (!isEditMode || !partyId || isTallyParty || deletePartyMutation.isPending) {
      return;
    }

    deletePartyMutation.mutate();
  };

  if (!cmp_id) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader
          title={isEditMode ? "Edit Customer" : "Create Customer"}
          showBack
        />
        <View className="flex-1 px-4 pt-4">
          <View className="rounded-[18px] border border-dashed border-slate-300 bg-white px-5 py-7">
            <Text className="text-center text-[14px] text-slate-500">
              Select a company first to manage customers.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (isEditMode && partyQuery.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Customer" showBack />
        <PageLoader message="Loading customer..." />
      </View>
    );
  }

  if (isEditMode && partyQuery.isError) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Edit Customer" showBack />
        <PageError
          title="Could not load customer"
          description="Please check the connection and try again."
          onRetry={() => void partyQuery.refetch()}
        />
      </View>
    );
  }

  if (accountGroupsQuery.isLoading && !hasAccountGroups) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader
          title={isEditMode ? "Edit Customer" : "Create Customer"}
          showBack
        />
        <PageLoader message="Loading account options..." />
      </View>
    );
  }

  if (accountGroupsQuery.isError) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader
          title={isEditMode ? "Edit Customer" : "Create Customer"}
          showBack
        />
        <PageError
          title="Could not load account options"
          description="Please check the connection and try again."
          onRetry={() => void accountGroupsQuery.refetch()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-2">
      <ScreenHeader
        title={isEditMode ? "Edit Customer" : "Create Customer"}
        showBack
      />

      {isTallyParty ? (
        <View className="flex-1 px-4 pt-4">
          <View className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-5">
            <Text className="text-[16px] font-bold text-amber-900">
              Editing is disabled for Tally customers
            </Text>
            <Text className="mt-2 text-[14px] leading-6 text-amber-800">
              {partyQuery.data?.partyName || "This customer"} was synced from
              Tally, so it can only be updated from the source system.
            </Text>
          </View>

          <Pressable
            onPress={() => router.replace("/customer-list")}
            className="mt-4 items-center rounded-2xl bg-[#134074] px-4 py-4"
          >
            <Text className="text-[15px] font-bold text-white">
              Back to Customers
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1">
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={110}
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
              name="partyName"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Party Name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter party name"
                  error={errors.partyName?.message}
                  required
                />
              )}
            />

            {/* <Controller
              control={control}
              name="partyType"
              render={({ field: { value } }) => (
                <SelectorField
                  label="Party Type"
                  value={
                    PARTY_TYPE_OPTIONS.find((option) => option.value === value)
                      ?.label
                  }
                  placeholder="Select party type"
                  onPress={() => partyTypeSheetRef.current?.present()}
                  error={errors.partyType?.message}
                  required
                />
              )}
            /> */}

            

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
                  error={errors.mobileNumber?.message}
                  
                />
              )}
            />

            <Controller
              control={control}
              name="accountGroup"
              render={() => (
                <SelectorField
                  label="Account Group"
                  value={selectedAccountGroupLabel}
                  placeholder="Select account group"
                  onPress={() => accountGroupSheetRef.current?.present()}
                  error={errors.accountGroup?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="subGroup"
              render={() => (
                <SelectorField
                  label="Sub Group"
                  value={
                    subGroupOptions.find((option) => option.value === selectedSubGroup)
                      ?.label
                  }
                  placeholder={
                    watchedAccountGroup
                      ? "Select sub group"
                      : "Choose account group first"
                  }
                  onPress={() => subGroupSheetRef.current?.present()}
                  disabled={!watchedAccountGroup}
                />
              )}
            />

            {selectedAccountGroupLabel ? (
              <Text className="-mt-2 mb-4 text-xs text-slate-400">
                Selected account group: {selectedAccountGroupLabel}
              </Text>
            ) : null}

            <Controller
              control={control}
              name="emailID"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.emailID?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="gstNo"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="GST Number"
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="Enter GST number"
                />
              )}
            />

            <Controller
              control={control}
              name="panNo"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="PAN Number"
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="Enter PAN number"
                  autoCapitalize="characters"
                />
              )}
            />

            <Controller
              control={control}
              name="billingAddress"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Billing Address"
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="Enter billing address"
                  multiline
                />
              )}
            />

            <Controller
              control={control}
              name="shippingAddress"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Shipping Address"
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="Enter shipping address"
                  multiline
                />
              )}
            />

            <Controller
              control={control}
              name="creditPeriod"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Credit Period"
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="Enter credit period"
                />
              )}
            />

            <Controller
              control={control}
              name="creditLimit"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="Credit Limit"
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="Enter credit limit"
                  keyboardType="number-pad"
                />
              )}
            />

            <Controller
              control={control}
              name="pin"
              render={({ field: { onChange, value } }) => (
                <InputField
                  label="PIN"
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="Enter PIN"
                  keyboardType="number-pad"
                />
              )}
            />

            <Controller
              control={control}
              name="country"
              render={() => (
                <SelectorField
                  label="Country"
                  value={selectedCountryLabel}
                  placeholder="Select country"
                  onPress={() => countrySheetRef.current?.present()}
                />
              )}
            />

            {isIndia ? (
              <Controller
                control={control}
                name="state"
                render={() => (
                  <SelectorField
                    label="State"
                    value={selectedState || ""}
                    placeholder="Select state"
                    onPress={() => stateSheetRef.current?.present()}
                  />
                )}
              />
            ) : (
              <Controller
                control={control}
                name="state"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="State"
                    value={value || ""}
                    onChangeText={onChange}
                    placeholder="Enter state"
                  />
                )}
              />
            )}
          </KeyboardAwareScrollView>

          <View
            className="border-t border-slate-100 bg-white px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="flex-row gap-3">
              {isEditMode ? (
                <Pressable
                  onPress={() => setIsDeleteDialogVisible(true)}
                  disabled={deletePartyMutation.isPending || savePartyMutation.isPending}
                  className={`flex-1 items-center rounded-2xl border px-4 py-4 ${
                    deletePartyMutation.isPending || savePartyMutation.isPending
                      ? "border-rose-200 bg-rose-100"
                      : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <Text className="text-[15px] font-bold text-rose-600">
                    {deletePartyMutation.isPending ? "Deleting..." : "Delete Customer"}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={savePartyMutation.isPending || deletePartyMutation.isPending}
                className={`items-center rounded-2xl px-4 py-4 ${
                  isEditMode ? "flex-1" : "w-full"
                } ${
                  savePartyMutation.isPending || deletePartyMutation.isPending
                    ? "bg-slate-300"
                    : "bg-[#134074]"
                }`}
              >
                <Text className="text-[15px] font-bold text-white">
                  {savePartyMutation.isPending
                    ? "Saving..."
                    : isEditMode
                      ? "Update Customer"
                      : "Create Customer"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <SelectorSheet
        sheetRef={partyTypeSheetRef}
        title="Party Type"
        options={PARTY_TYPE_OPTIONS}
        selectedValue={selectedPartyType}
        onSelect={(value) =>
          setValue("partyType", value as CustomerFormValues["partyType"], {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />

      <SelectorSheet
        sheetRef={accountGroupSheetRef}
        title="Account Group"
        options={accountGroupOptions}
        selectedValue={watchedAccountGroup}
        onSelect={(value) => {
          setValue("accountGroup", value, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setValue("subGroup", "", {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />

      <SelectorSheet
        sheetRef={subGroupSheetRef}
        title="Sub Group"
        options={subGroupOptions}
        selectedValue={selectedSubGroup || ""}
        onSelect={(value) =>
          setValue("subGroup", value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />

      <SelectorSheet
        sheetRef={countrySheetRef}
        title="Country"
        options={COUNTRY_OPTIONS}
        selectedValue={selectedCountryLabel}
        onSelect={(value) =>
          setValue("country", value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />

      <SelectorSheet
        sheetRef={stateSheetRef}
        title="State"
        options={STATE_OPTIONS}
        selectedValue={selectedState || ""}
        onSelect={(value) =>
          setValue("state", value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />

      <Portal>
        <Dialog
          visible={isDeleteDialogVisible}
          onDismiss={() => {
            if (!deletePartyMutation.isPending) {
              setIsDeleteDialogVisible(false);
            }
          }}
          style={{ borderRadius: 28, backgroundColor: "#ffffff" }}
        >
          <Dialog.Title>Delete this customer?</Dialog.Title>
          <Dialog.Content>
            <PaperText variant="bodyMedium" style={{ color: "#475569", lineHeight: 22 }}>
              {partyQuery.data?.partyName || "This customer"} will be permanently removed.
              This action cannot be undone.
            </PaperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor="#64748b"
              disabled={deletePartyMutation.isPending}
              onPress={() => setIsDeleteDialogVisible(false)}
            >
              Cancel
            </Button>
            <Button
              buttonColor="#e11d48"
              textColor="#ffffff"
              loading={deletePartyMutation.isPending}
              disabled={deletePartyMutation.isPending}
              onPress={handleDeleteCustomer}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
