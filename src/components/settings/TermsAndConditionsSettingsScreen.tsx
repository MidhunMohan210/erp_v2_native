import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScrollText, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  useCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
} from "@/hooks/queries/companySettingsQueries";
import { useAppSelector } from "@/store/hooks";
import { SettingsNavRow } from "@/components/vouchers/VoucherUi";

type TermsSource = "sale" | "saleOrder";

type TermsAndConditionsSettingsScreenProps = {
  termsSource: TermsSource;
};

type TermsAndConditionsSheetProps = {
  visible: boolean;
  title: string;
  initialTerms: string[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (terms: string[]) => void;
};

function normalizeTerms(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function TermsAndConditionsSheet({
  visible,
  title,
  initialTerms,
  isSaving,
  onClose,
  onSave,
}: TermsAndConditionsSheetProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (visible) {
      setValue(initialTerms.join("\n"));
    }
  }, [initialTerms, visible]);

  const previewTerms = useMemo(() => normalizeTerms(value), [value]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/35">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close terms and conditions editor"
          className="flex-1"
          disabled={isSaving}
          onPress={onClose}
        />

        <View
          className="h-[82%] rounded-t-[28px] bg-white px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[18px] font-extrabold text-slate-900">
                {title} terms
              </Text>
              <Text className="mt-1 text-[13px] leading-5 text-slate-500">
                Add one terms and conditions line per row.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={isSaving}
              hitSlop={10}
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X color="#475569" size={19} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            className="mt-5 flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text className="mb-2 text-[13px] font-semibold text-slate-700">
              Terms &amp; Conditions
            </Text>
            <TextInput
              multiline
              textAlignVertical="top"
              value={value}
              onChangeText={setValue}
              placeholder="Enter one term per line"
              placeholderTextColor="#94a3b8"
              className="min-h-[160px] rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[14px] leading-5 text-slate-900"
            />

            <View className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Text className="text-[14px] font-bold text-slate-900">
                Preview
              </Text>
              {previewTerms.length === 0 ? (
                <Text className="mt-3 text-[13px] text-slate-500">
                  Terms will appear here as you type.
                </Text>
              ) : (
                previewTerms.map((term, index) => (
                  <View key={`${index}-${term}`} className="mt-3 flex-row">
                    <Text className="mr-2 text-[13px] font-semibold text-slate-500">
                      {index + 1}.
                    </Text>
                    <Text className="flex-1 text-[13px] leading-5 text-slate-700">
                      {term}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          <View className="mt-4 flex-row gap-3 border-t border-slate-100 pt-4">
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onClose}
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3.5"
            >
              <Text className="text-center text-[14px] font-bold text-slate-700">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => onSave(normalizeTerms(value))}
              className={`flex-1 rounded-2xl bg-[#134074] px-4 py-3.5 ${
                isSaving ? "opacity-50" : ""
              }`}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-[14px] font-bold text-white">
                  Save
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function TermsAndConditionsSettingsScreen({
  termsSource,
}: TermsAndConditionsSettingsScreenProps) {
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const companyId = selectedCompany?._id ?? "";
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const settingsQuery = useCompanySettingsQuery(companyId);
  const updateSettingsMutation = useUpdateCompanySettingsMutation(companyId);
  const isSale = termsSource === "sale";
  const title = isSale ? "Sale" : "Sale Order";
  const terms = isSale
    ? settingsQuery.data?.dataEntry?.sale?.termsAndConditions ?? []
    : settingsQuery.data?.dataEntry?.order?.termsAndConditions ?? [];

  const handleSave = async (nextTerms: string[]) => {
    if (!companyId) {
      toast.error("Select a company first");
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync(
        isSale
          ? { dataEntry: { sale: { termsAndConditions: nextTerms } } }
          : { dataEntry: { order: { termsAndConditions: nextTerms } } },
      );
      toast.success(`${title} terms saved`);
      setIsSheetVisible(false);
    } catch {
      // The mutation displays the save error.
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title={title} />
      {isCompanyLoading ? (
        <PageLoader message="Loading company..." />
      ) : !companyId ? (
        <View className="px-4 pt-4">
          <View className="rounded-2xl bg-slate-50 px-5 py-5">
            <Text className="text-[16px] font-bold text-slate-800">
              No company selected
            </Text>
            <Text className="mt-1 text-[14px] leading-5 text-slate-500">
              Select a company first to manage {title.toLowerCase()} settings.
            </Text>
          </View>
        </View>
      ) : settingsQuery.isLoading ? (
        <PageLoader message={`Loading ${title.toLowerCase()} settings...`} />
      ) : settingsQuery.isError ? (
        <PageError
          title={`Could not load ${title.toLowerCase()} settings`}
          description="Please check the connection and try again."
          onRetry={() => void settingsQuery.refetch()}
        />
      ) : (
        <ScrollView className="flex-1 px-4 pt-1">
          <SettingsNavRow
            title="Terms And Conditions"
            description={
              terms.length > 0
                ? `${terms.length} saved term${terms.length === 1 ? "" : "s"}`
                : `Add terms and conditions for ${title.toLowerCase()}.`
            }
            icon={ScrollText}
            iconColor="#134074"
            onPress={() => setIsSheetVisible(true)}
          />
        </ScrollView>
      )}

      <TermsAndConditionsSheet
        visible={isSheetVisible}
        title={title}
        initialTerms={terms}
        isSaving={updateSettingsMutation.isPending}
        onClose={() => setIsSheetVisible(false)}
        onSave={(nextTerms) => void handleSave(nextTerms)}
      />
    </View>
  );
}
