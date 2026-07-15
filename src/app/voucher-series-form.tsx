import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import {
  Field,
  PrimaryButton,
  SectionCard,
} from "@/components/vouchers/VoucherUi";
import {
  useVoucherSeriesListQuery,
  voucherSeriesQueryKeys,
} from "@/hooks/queries/voucherQueries";
import { voucherSeriesService } from "@/services/voucherSeries.service";
import { useAppSelector } from "@/store/hooks";
import type {
  CreateVoucherSeriesPayload,
  VoucherSeriesPayload,
  VoucherType,
} from "@/types/voucher";
import { getVoucherTypeLabel } from "@/utils/voucher";

const middleSeparatorPattern = /^[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*$/;

type VoucherSeriesFormValues = {
  seriesName: string;
  prefix: string;
  suffix: string;
  currentNumber: string;
  widthOfNumericalPart: string;
};

export default function VoucherSeriesFormScreen() {
  const params = useLocalSearchParams<{
    voucherType?: string;
    seriesId?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const voucherType = (
    params.voucherType === "receipt" ? "receipt" : "saleOrder"
  ) as VoucherType;

  const seriesQuery = useVoucherSeriesListQuery(
    selectedCompany?._id ?? "",
    voucherType,
    Boolean(selectedCompany?._id),
  );

  const editingSeries = useMemo(
    () => seriesQuery.data?.series.find((item) => item._id === params.seriesId),
    [params.seriesId, seriesQuery.data],
  );

  const [isSaving, setIsSaving] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<VoucherSeriesFormValues>({
    defaultValues: {
      seriesName: "",
      prefix: "",
      suffix: "",
      currentNumber: "1",
      widthOfNumericalPart: "1",
    },
    mode: "onChange",
  });

  const formValues = watch();

  useEffect(() => {
    if (!editingSeries) {
      reset({
        seriesName: "",
        prefix: "",
        suffix: "",
        currentNumber: "1",
        widthOfNumericalPart: "1",
      });
      return;
    }

    reset({
      seriesName: editingSeries.seriesName || "",
      prefix: editingSeries.prefix || "",
      suffix: editingSeries.suffix || "",
      currentNumber: String(editingSeries.currentNumber ?? 1),
      widthOfNumericalPart: String(editingSeries.widthOfNumericalPart ?? 1),
    });
  }, [editingSeries, reset]);

  const handleSave = async (values: VoucherSeriesFormValues) => {
    if (!selectedCompany?._id) {
      toast.error("Select a company first");
      return;
    }

    const widthValue = Number(values.widthOfNumericalPart) || 0;
    const currentNumberValue = Number(values.currentNumber) || 0;

    try {
      setIsSaving(true);

      const basePayload: VoucherSeriesPayload = {
        voucherType,
        seriesName: values.seriesName.trim(),
        prefix: values.prefix.trim(),
        suffix: values.suffix.trim(),
        widthOfNumericalPart: widthValue,
      };

      if (editingSeries?._id) {
        await voucherSeriesService.updateVoucherSeries({
          cmp_id: selectedCompany._id,
          seriesId: editingSeries._id,
          payload: basePayload,
        });
      } else {
        const createPayload: CreateVoucherSeriesPayload = {
          ...basePayload,
          currentNumber: currentNumberValue,
        };

        await voucherSeriesService.createVoucherSeries(
          selectedCompany._id,
          createPayload,
        );
      }

      await queryClient.invalidateQueries({
        queryKey: voucherSeriesQueryKeys.list(selectedCompany._id, voucherType),
      });

      toast.success(editingSeries ? "Series updated" : "Series created");
      router.back();
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "Failed to save series";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const livePreview = () => {
    const rawNumber = editingSeries
      ? String(editingSeries.currentNumber ?? 1)
      : formValues.currentNumber || "1";
    const widthValue = Number(formValues.widthOfNumericalPart || 1);
    const paddedNumber = rawNumber.padStart(widthValue || 1, "0");
    const prefix = formValues.prefix?.trim()
      ? `${formValues.prefix.trim()}/`
      : "";
    const suffix = formValues.suffix?.trim()
      ? `/${formValues.suffix.trim()}`
      : "";

    return `${prefix}${paddedNumber}${suffix}`;
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title={
          editingSeries
            ? `Edit ${getVoucherTypeLabel(voucherType)} Series`
            : `New ${getVoucherTypeLabel(voucherType)} Series`
        }
      />
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <SectionCard
        
          title="Series Details"
        >
          <Controller
            control={control}
            name="seriesName"
            rules={{
              required: "Series name is required",
            }}
            render={({ field: { onChange, value } }) => (
              <Field
                label="Series name"
                value={value}
                onChangeText={onChange}
                placeholder="Example: Sales 2026"
                errorText={errors.seriesName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="prefix"
            render={({ field: { onChange, value } }) => (
              <View>
                <Field
                  label="Prefix"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Example: FY2025/2026"
                  errorText={errors.prefix?.message}
                />
                <Text className="mb-3 -mt-2 text-[11px] text-slate-400">
                  Letters and numbers only at the start or end. Use slash or
                  hyphen only in the middle.
                </Text>
              </View>
            )}
            rules={{
              validate: (value) =>
                value === "" ||
                middleSeparatorPattern.test(value) ||
                'Use "/" or "-" only in the middle.',
            }}
          />
          <Controller
            control={control}
            name="suffix"
            rules={{
              validate: (value) =>
                value === "" ||
                middleSeparatorPattern.test(value) ||
                'Use "/" or "-" only in the middle.',
            }}
            render={({ field: { onChange, value } }) => (
              <View>
                <Field
                  label="Suffix"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Example: 2025/2026"
                  errorText={errors.suffix?.message}
                />
                <Text className="mb-3 -mt-2 text-[11px] text-slate-400">
                  Letters and numbers only at the start or end. Use slash or
                  hyphen only in the middle.
                </Text>
              </View>
            )}
          />
          {!editingSeries ? (
            <Controller
              control={control}
              name="currentNumber"
              rules={{
                required: "Current number is required",
                validate: (value) => {
                  if (!/^\d+$/.test(value || "")) {
                    return "Enter digits only";
                  }

                  if (Number(value) < 1) {
                    return "Current number must be at least 1";
                  }

                  return true;
                },
              }}
              render={({ field: { onChange, value } }) => (
                <Field
                  label="Current number"
                  value={value}
                  onChangeText={onChange}
                  placeholder="1"
                  keyboardType="numeric"
                  errorText={errors.currentNumber?.message}
                />
              )}
            />
          ) : null}
          <Controller
            control={control}
            name="widthOfNumericalPart"
            rules={{
              required: "Width of numerical part is required",
              validate: (value) => {
                if (!/^\d+$/.test(value || "")) {
                  return "Enter digits only";
                }

                if (Number(value) < 1) {
                  return "Width of numerical part must be at least 1";
                }

                if (Number(value) > 5) {
                  return "Width of numerical part cannot exceed 5";
                }

                return true;
              },
            }}
            render={({ field: { onChange, value } }) => (
              <View>
                <Field
                  label="Width of numerical part"
                  value={value}
                  onChangeText={onChange}
                  placeholder="1"
                  keyboardType="numeric"
                  errorText={errors.widthOfNumericalPart?.message}
                />
                <Text className="mb-3 -mt-2 text-[11px] text-slate-400">
                  Controls zero padding. Width 4 with value 12 becomes 0012. Max
                  5.
                </Text>
              </View>
            )}
          />

          <View className="rounded-[14px] border border-dashed border-slate-300 bg-white px-4 py-3">
            <Text className="text-[11px] font-medium text-slate-500">
              Live preview
            </Text>
            <Text className="mt-1 text-[15px] font-bold tracking-[0.16em] text-slate-900">
              {livePreview()}
            </Text>
          </View>

          <PrimaryButton
            extraStyles="mt-6"
            label={
              isSaving
                ? "Saving..."
                : editingSeries
                  ? "Update Series"
                  : "Create Series"
            }
            disabled={isSaving}
            onPress={() => void handleSubmit(handleSave)()}
          />
        </SectionCard>
      </ScrollView>
    </View>
  );
}
