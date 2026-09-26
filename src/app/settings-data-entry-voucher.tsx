import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Landmark, Rows3 } from "lucide-react-native";
import { toast } from "sonner-native";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { VoucherBankAccountSheet } from "@/components/settings/VoucherBankAccountSheet";
import {
  useCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
} from "@/hooks/queries/companySettingsQueries";
import { useAppSelector } from "@/store/hooks";
import { SettingsNavRow } from "@/components/vouchers/VoucherUi";

export default function SettingsDataEntryVoucherScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isBankSheetVisible, setIsBankSheetVisible] = useState(false);
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const companyId = selectedCompany?._id ?? "";
  const settingsQuery = useCompanySettingsQuery(companyId);
  const updateSettingsMutation = useUpdateCompanySettingsMutation(companyId);
  const savedBank =
    settingsQuery.data?.dataEntry?.voucher?.defaultBankAccountId ?? null;

  const handleSaveBank = async (bankId: string | null) => {
    if (!companyId) {
      toast.error("Select a company first");
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        dataEntry: {
          voucher: {
            defaultBankAccountId: bankId,
          },
        },
      });
      toast.success("Voucher settings saved");
      setIsBankSheetVisible(false);
    } catch {
      // The mutation displays the save error.
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Voucher" />
      {isCompanyLoading ? (
        <PageLoader message="Loading company..." />
      ) : !companyId ? (
        <View className="px-4 pt-4">
          <View className="rounded-2xl bg-slate-50 px-5 py-5">
            <Text className="text-[16px] font-bold text-slate-800">
              No company selected
            </Text>
            <Text className="mt-1 text-[14px] leading-5 text-slate-500">
              Select a company first to manage voucher settings.
            </Text>
          </View>
        </View>
      ) : settingsQuery.isLoading ? (
        <PageLoader message="Loading voucher settings..." />
      ) : settingsQuery.isError ? (
        <PageError
          title="Could not load voucher settings"
          description="Please check the connection and try again."
          onRetry={() => void settingsQuery.refetch()}
        />
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <SettingsNavRow
            title="Voucher Series"
            icon={Rows3}
            iconColor="#134074"
            onPress={() => router.push("/settings-voucher-series")}
          />
          <SettingsNavRow
            title="Select Bank Account"
            description={
              savedBank
                ? `${savedBank.partyName || "Untitled Bank"}${
                    savedBank.bank_name ? ` - ${savedBank.bank_name}` : ""
                  }`
                : "No default bank account"
            }
            icon={Landmark}
            iconColor="#134074"
            onPress={() => setIsBankSheetVisible(true)}
          />
        </ScrollView>
      )}

      <VoucherBankAccountSheet
        visible={isBankSheetVisible}
        companyId={companyId}
        savedBank={savedBank}
        isSaving={updateSettingsMutation.isPending}
        onClose={() => setIsBankSheetVisible(false)}
        onSave={(bankId) => void handleSaveBank(bankId)}
      />
    </View>
  );
}
