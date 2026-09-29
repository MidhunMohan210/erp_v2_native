import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { isAxiosError } from "axios";
import { Trash2 } from "lucide-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  Field,
  PrimaryButton,
  SectionCard,
} from "@/components/vouchers/VoucherUi";
import {
  useSaveTaxClassificationMutation,
  useTaxClassificationDetailQuery,
} from "@/hooks/queries/taxClassificationQueries";
import { useAppSelector } from "@/store/hooks";
import {
  TAXABILITY_TYPES,
  type TaxCalculationMode,
  type TaxClassification,
  type TaxClassificationPayload,
  type TaxFields,
  type TaxRateSlab,
  type TaxabilityType,
} from "@/types/taxClassification";

type TaxFieldsForm = {
  taxability_type: TaxabilityType;
  igst_rate: string;
  cgst_rate: string;
  sgst_utgst_rate: string;
  cess_based_on_value: string;
  cess_based_on_quantity: string;
};

type RateSlabForm = TaxFieldsForm & {
  key: string;
  greater_than: string;
  upto: string;
};

type FormValues = {
  hsn_code: string;
  description: string;
  calculation_mode: TaxCalculationMode;
  applicable_for_revised_charge: boolean;
  on_value: TaxFieldsForm;
  rate_slabs: RateSlabForm[];
};

type FormErrors = Record<string, string>;

// Keep the Item Rate implementation ready for a later rollout. It is hidden now.
const ENABLE_ON_ITEM_RATE = false;

const emptyTaxFields = (): TaxFieldsForm => ({
  taxability_type: "Taxable",
  igst_rate: "",
  cgst_rate: "",
  sgst_utgst_rate: "",
  cess_based_on_value: "0",
  cess_based_on_quantity: "0",
});

const createSlab = (): RateSlabForm => ({
  key: `${Date.now()}-${Math.random()}`,
  greater_than: "",
  upto: "",
  ...emptyTaxFields(),
});

const initialFormValues = (): FormValues => ({
  hsn_code: "",
  description: "",
  calculation_mode: "on_value",
  applicable_for_revised_charge: false,
  on_value: emptyTaxFields(),
  rate_slabs: [createSlab()],
});

function taxFieldsToForm(taxFields: TaxFields | undefined): TaxFieldsForm {
  return {
    taxability_type: taxFields?.taxability_type ?? "Taxable",
    igst_rate: String(taxFields?.igst_rate ?? ""),
    cgst_rate: String(taxFields?.cgst_rate ?? ""),
    sgst_utgst_rate: String(taxFields?.sgst_utgst_rate ?? ""),
    cess_based_on_value: String(taxFields?.cess_based_on_value ?? 0),
    cess_based_on_quantity: String(taxFields?.cess_based_on_quantity ?? 0),
  };
}

function classificationToForm(classification: TaxClassification): FormValues {
  const rateSlabs = classification.rate_slabs.length
    ? classification.rate_slabs.map((slab) => ({
        key: `${Date.now()}-${Math.random()}`,
        greater_than: String(slab.greater_than),
        upto: String(slab.upto),
        ...taxFieldsToForm(slab),
      }))
    : [createSlab()];

  return {
    hsn_code: classification.hsn_code,
    description: classification.description,
    calculation_mode: classification.calculation_mode,
    applicable_for_revised_charge: classification.applicable_for_revised_charge,
    on_value: taxFieldsToForm(classification.on_value),
    rate_slabs: syncSlabBoundaries(rateSlabs),
  };
}

// Every later slab starts exactly where the previous slab ends.
function syncSlabBoundaries(slabs: RateSlabForm[]): RateSlabForm[] {
  return slabs.map((slab, index) =>
    index === 0 ? slab : { ...slab, greater_than: slabs[index - 1].upto },
  );
}

function ChoiceGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`rounded-xl border px-3 py-2.5 ${
              selected
                ? "border-[#134074] bg-[#134074]"
                : "border-slate-200 bg-white"
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${selected ? "text-white" : "text-slate-600"}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TaxFieldsEditor({
  value,
  errors,
  fieldPrefix,
  onChange,
}: {
  value: TaxFieldsForm;
  errors: FormErrors;
  fieldPrefix: string;
  onChange: (value: TaxFieldsForm) => void;
}) {
  const isTaxable = value.taxability_type === "Taxable";

  const update = (field: keyof TaxFieldsForm, nextValue: string) => {
    if (field === "igst_rate") {
      const igstRate = Number(nextValue);

      // CGST and SGST normally split IGST equally. Users can still edit either field afterwards.
      if (nextValue.trim() !== "" && Number.isFinite(igstRate)) {
        const halfRate = String(igstRate / 2);
        onChange({
          ...value,
          igst_rate: nextValue,
          cgst_rate: halfRate,
          sgst_utgst_rate: halfRate,
        });
        return;
      }
    }

    onChange({ ...value, [field]: nextValue });
  };

  return (
    <View>
      <Text className="mb-2 text-[13px] font-semibold text-slate-700">
        Taxability Type <Text className="text-rose-500">*</Text>
      </Text>
      <ChoiceGroup
        value={value.taxability_type}
        options={TAXABILITY_TYPES.map((taxabilityType) => ({
          value: taxabilityType,
          label: taxabilityType,
        }))}
        onChange={(taxability_type) => {
          if (taxability_type !== "Taxable") {
            // The API still requires numeric tax keys, even when this tax type has no tax.
            onChange({
              ...value,
              taxability_type,
              igst_rate: "0",
              cgst_rate: "0",
              sgst_utgst_rate: "0",
              cess_based_on_value: "0",
              cess_based_on_quantity: "0",
            });
            return;
          }

          onChange({ ...value, taxability_type });
        }}
      />
      {errors[`${fieldPrefix}.taxability_type`] ? (
        <Text className="mt-1 text-[12px] text-rose-500">
          {errors[`${fieldPrefix}.taxability_type`]}
        </Text>
      ) : null}
      <View className="mt-4">
        {!isTaxable ? (
          <Text className="mb-3 text-[12px] text-slate-500">
            Tax rates and cess are available only for taxable classifications.
          </Text>
        ) : null}
        <Field
          required
          label="IGST Rate (%)"
          value={value.igst_rate}
          onChangeText={(text) => update("igst_rate", text)}
          keyboardType="numeric"
          errorText={errors[`${fieldPrefix}.igst_rate`]}
          disabled={!isTaxable}
        />
        <Field
          required
          label="CGST Rate (%)"
          value={value.cgst_rate}
          onChangeText={(text) => update("cgst_rate", text)}
          keyboardType="numeric"
          errorText={errors[`${fieldPrefix}.cgst_rate`]}
          disabled={!isTaxable}
        />
        <Field
          required
          label="SGST/UTGST Rate (%)"
          value={value.sgst_utgst_rate}
          onChangeText={(text) => update("sgst_utgst_rate", text)}
          keyboardType="numeric"
          errorText={errors[`${fieldPrefix}.sgst_utgst_rate`]}
          disabled={!isTaxable}
        />
        <Field
          required
          label="Cess Based on Value"
          value={value.cess_based_on_value}
          onChangeText={(text) => update("cess_based_on_value", text)}
          keyboardType="numeric"
          errorText={errors[`${fieldPrefix}.cess_based_on_value`]}
          disabled={!isTaxable}
        />
        <Field
          required
          label="Cess Based on Quantity"
          value={value.cess_based_on_quantity}
          onChangeText={(text) => update("cess_based_on_quantity", text)}
          keyboardType="numeric"
          errorText={errors[`${fieldPrefix}.cess_based_on_quantity`]}
          disabled={!isTaxable}
        />
      </View>
    </View>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (status === 401 || status === 403)
      return "Your company access has changed. Please select the company again.";
    if (status === 404) return "This tax classification no longer exists.";
    if (status === 409)
      return "This HSN/SAC code already exists for the selected company.";
  }
  return error instanceof Error ? error.message : fallback;
}

export default function TaxClassificationFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const classificationId = params.id ?? "";
  const detailQuery = useTaxClassificationDetailQuery(
    selectedCompany?._id ?? "",
    classificationId,
  );
  const saveMutation = useSaveTaxClassificationMutation();
  const [values, setValues] = useState<FormValues>(initialFormValues);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!detailQuery.data) return;

    const formValues = classificationToForm(detailQuery.data);
    setValues(
      ENABLE_ON_ITEM_RATE
        ? formValues
        : { ...formValues, calculation_mode: "on_value" },
    );
  }, [detailQuery.data]);

  const updateValue = <Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const updateSlabs = (rate_slabs: RateSlabForm[]) => {
    updateValue("rate_slabs", syncSlabBoundaries(rate_slabs));
  };

  const addSlab = () => {
    const latestSlab = values.rate_slabs[values.rate_slabs.length - 1];
    updateSlabs([
      ...values.rate_slabs,
      {
        ...createSlab(),
        greater_than: latestSlab?.upto ?? "",
      },
    ]);
  };

  const removeLatestSlab = () => {
    if (values.rate_slabs.length <= 1) return;
    updateSlabs(values.rate_slabs.slice(0, -1));
  };

  const buildPayload = (): TaxClassificationPayload | null => {
    const nextErrors: FormErrors = {};
    const numericValue = (
      raw: string,
      field: string,
      options: { max?: number; nonNegative?: boolean } = {},
    ) => {
      if (raw.trim() === "") {
        nextErrors[field] = "This field is required";
        return null;
      }
      const numberValue = Number(raw);
      if (!Number.isFinite(numberValue)) {
        nextErrors[field] = "Enter a valid number";
        return null;
      }
      if (options.nonNegative && numberValue < 0) {
        nextErrors[field] = "Cannot be negative";
        return null;
      }
      if (
        options.max !== undefined &&
        (numberValue < 0 || numberValue > options.max)
      ) {
        nextErrors[field] = `Must be between 0 and ${options.max}`;
        return null;
      }
      return numberValue;
    };

    const parseTaxFields = (
      taxFields: TaxFieldsForm,
      prefix: string,
    ): TaxFields | null => {
      const igst_rate = numericValue(
        taxFields.igst_rate,
        `${prefix}.igst_rate`,
        { max: 100 },
      );
      const cgst_rate = numericValue(
        taxFields.cgst_rate,
        `${prefix}.cgst_rate`,
        { max: 100 },
      );
      const sgst_utgst_rate = numericValue(
        taxFields.sgst_utgst_rate,
        `${prefix}.sgst_utgst_rate`,
        { max: 100 },
      );
      const cess_based_on_value = numericValue(
        taxFields.cess_based_on_value,
        `${prefix}.cess_based_on_value`,
        { nonNegative: true },
      );
      const cess_based_on_quantity = numericValue(
        taxFields.cess_based_on_quantity,
        `${prefix}.cess_based_on_quantity`,
        { nonNegative: true },
      );

      if (
        [
          igst_rate,
          cgst_rate,
          sgst_utgst_rate,
          cess_based_on_value,
          cess_based_on_quantity,
        ].some((value) => value === null)
      ) {
        return null;
      }

      return {
        ...taxFields,
        igst_rate: igst_rate as number,
        cgst_rate: cgst_rate as number,
        sgst_utgst_rate: sgst_utgst_rate as number,
        cess_based_on_value: cess_based_on_value as number,
        cess_based_on_quantity: cess_based_on_quantity as number,
      };
    };

    if (!values.hsn_code.trim())
      nextErrors.hsn_code = "HSN/SAC code is required";
    if (!values.description.trim())
      nextErrors.description = "Description is required";

    let on_value: TaxFields | undefined;
    let rate_slabs: TaxRateSlab[] | undefined;
    if (values.calculation_mode === "on_value") {
      on_value = parseTaxFields(values.on_value, "on_value") ?? undefined;
    } else {
      rate_slabs = values.rate_slabs
        .map((slab, index) => {
          const greater_than = numericValue(
            slab.greater_than,
            `rate_slabs.${index}.greater_than`,
          );
          const upto = numericValue(slab.upto, `rate_slabs.${index}.upto`);
          const taxFields = parseTaxFields(slab, `rate_slabs.${index}`);
          if (greater_than === null || upto === null || !taxFields) return null;
          if (upto <= greater_than) {
            nextErrors[`rate_slabs.${index}.upto`] =
              "Up To must be greater than Greater Than";
            return null;
          }
          return { ...taxFields, greater_than, upto };
        })
        .filter((slab): slab is TaxRateSlab => slab !== null);

      for (
        let firstIndex = 0;
        firstIndex < rate_slabs.length;
        firstIndex += 1
      ) {
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < rate_slabs.length;
          secondIndex += 1
        ) {
          const first = rate_slabs[firstIndex];
          const second = rate_slabs[secondIndex];
          if (
            first.greater_than < second.upto &&
            second.greater_than < first.upto
          ) {
            nextErrors.rate_slabs = "Slab ranges cannot overlap";
          }
        }
      }
    }

    setErrors(nextErrors);
    if (
      Object.keys(nextErrors).length > 0 ||
      (!on_value && values.calculation_mode === "on_value")
    )
      return null;

    return {
      hsn_code: values.hsn_code.trim(),
      description: values.description.trim(),
      calculation_mode: values.calculation_mode,
      applicable_for_revised_charge: values.applicable_for_revised_charge,
      ...(values.calculation_mode === "on_value"
        ? { on_value, rate_slabs: [] }
        : { rate_slabs }),
    };
  };

  const save = async () => {
    if (!selectedCompany?._id) {
      toast.error("Select a company first");
      return;
    }
    const payload = buildPayload();
    if (!payload) return;

    try {
      await saveMutation.mutateAsync({
        cmp_id: selectedCompany._id,
        classificationId: classificationId || undefined,
        payload,
      });
      toast.success(
        classificationId
          ? "Tax classification updated"
          : "Tax classification created",
      );
      router.back();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save tax classification"));
    }
  };

  if (classificationId && detailQuery.isLoading)
    return <PageLoader message="Loading tax classification..." />;
  if (classificationId && detailQuery.isError) {
    return (
      <PageError
        title="Could not load tax classification"
        description={getErrorMessage(detailQuery.error, "Please try again.")}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title={
          classificationId
            ? "Edit Tax Classification"
            : "New Tax Classification"
        }
      />
      <KeyboardAwareScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40}}
        extraScrollHeight={24}
        enableOnAndroid
      >
        <SectionCard title="Basic Details">
          <Field
            required
            label="HSN/SAC Code"
            value={values.hsn_code}
            onChangeText={(hsn_code) => updateValue("hsn_code", hsn_code)}
            placeholder="Example: 8471"
            errorText={errors.hsn_code}
          />
          <Field
            required
            label="Description"
            value={values.description}
            onChangeText={(description) =>
              updateValue("description", description)
            }
            placeholder="Describe this classification"
            errorText={errors.description}
          />
          <Text className="mb-2 text-[13px] font-semibold text-slate-700">
            Calculation Mode <Text className="text-rose-500">*</Text>
          </Text>
          {ENABLE_ON_ITEM_RATE ? (
            <ChoiceGroup
              value={values.calculation_mode}
              options={[
                { value: "on_value", label: "On Value" },
                { value: "on_item_rate", label: "On Item Rate" },
              ]}
              onChange={(calculation_mode) =>
                updateValue("calculation_mode", calculation_mode)
              }
            />
          ) : (
            <View className="self-start rounded-xl border border-[#134074] bg-[#134074] px-3 py-2.5">
              <Text className="text-[13px] font-bold text-white">On Value</Text>
            </View>
          )}
        </SectionCard>

        {!ENABLE_ON_ITEM_RATE || values.calculation_mode === "on_value" ? (
          <SectionCard title="On Value Tax">
            <TaxFieldsEditor
              value={values.on_value}
              errors={errors}
              fieldPrefix="on_value"
              onChange={(on_value) => updateValue("on_value", on_value)}
            />
          </SectionCard>
        ) : (
          <SectionCard
            title="On Item Rate Slabs"
            description="Add only the ranges your business needs."
          >
            {errors.rate_slabs ? (
              <Text className="mb-3 text-[12px] text-rose-500">
                {errors.rate_slabs}
              </Text>
            ) : null}
            {values.rate_slabs.map((slab, index) => (
              <View
                key={slab.key}
                className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-[15px] font-extrabold text-[#17203a]">
                    Slab {index + 1}
                  </Text>
                  {index === values.rate_slabs.length - 1 &&
                  values.rate_slabs.length > 1 ? (
                    <Pressable onPress={removeLatestSlab} hitSlop={8}>
                      <Trash2 color="#e11d48" size={19} />
                    </Pressable>
                  ) : null}
                </View>
                <Field
                  required
                  label="Greater Than"
                  value={slab.greater_than}
                  onChangeText={(greater_than) =>
                    updateSlabs(
                      values.rate_slabs.map((item) =>
                        item.key === slab.key
                          ? { ...item, greater_than }
                          : item,
                      ),
                    )
                  }
                  keyboardType="numeric"
                  errorText={errors[`rate_slabs.${index}.greater_than`]}
                  disabled={index > 0}
                />
                <Field
                  required
                  label="Up To"
                  value={slab.upto}
                  onChangeText={(upto) =>
                    updateSlabs(
                      values.rate_slabs.map((item) =>
                        item.key === slab.key ? { ...item, upto } : item,
                      ),
                    )
                  }
                  keyboardType="numeric"
                  errorText={errors[`rate_slabs.${index}.upto`]}
                />
                <TaxFieldsEditor
                  value={slab}
                  errors={errors}
                  fieldPrefix={`rate_slabs.${index}`}
                  onChange={(nextTaxFields) =>
                    updateSlabs(
                      values.rate_slabs.map((item) =>
                        item.key === slab.key
                          ? { ...item, ...nextTaxFields }
                          : item,
                      ),
                    )
                  }
                />
              </View>
            ))}
            <PrimaryButton
              secondary
              label="Add Slab"
              onPress={addSlab}
              extraStyles="mt-1"
            />
          </SectionCard>
        )}

        <SectionCard title="Additional Setting">
          <View className="flex-row items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <View className="mr-4 flex-1">
              <Text className="text-[14px] font-bold text-slate-800">
                Applicable for Revised Charge
              </Text>
              <Text className="mt-1 text-[12px] text-slate-500">
                Include this classification when revised charges apply.
              </Text>
            </View>
            <Switch
              value={values.applicable_for_revised_charge}
              onValueChange={(applicable_for_revised_charge) =>
                updateValue(
                  "applicable_for_revised_charge",
                  applicable_for_revised_charge,
                )
              }
              trackColor={{ false: "#cbd5e1", true: "#134074" }}
            />
          </View>
        </SectionCard>
      </KeyboardAwareScrollView>
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="border-t border-slate-200 bg-white px-4 pt-3"
      >
        <PrimaryButton
          label={
            saveMutation.isPending
              ? "Saving..."
              : classificationId
                ? "Update Classification"
                : "Create Classification"
          }
          disabled={saveMutation.isPending}
          onPress={() => void save()}
        />
      </View>
    </View>
  );
}
