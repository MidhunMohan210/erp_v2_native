import { useState } from "react";
import { isAxiosError } from "axios";
import { Mail, Link2 } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useTallyIntegrationInfoQuery } from "@/hooks/queries/integrationQueries";
import { integrationService } from "@/services/integration.service";
import { useAppSelector } from "@/store/hooks";

function getStatusLabel(status?: "active" | "inactive"): string {
  return status === "active" ? "Active" : "Inactive";
}

export default function SettingsIntegrationsScreen() {
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const companyId = selectedCompany?._id ?? "";
  const integrationQuery = useTallyIntegrationInfoQuery(companyId);

  const handleSendEmail = async () => {
    if (!companyId) {
      toast.error("Select a company first");
      return;
    }

    try {
      setIsSendingEmail(true);
      const response = await integrationService.sendTallyIntegrationKeyEmail(
        companyId,
      );
      toast.success(response.message || "API key sent to admin email");
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "Failed to send API key email";
      toast.error(message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Integrations" />

      {isCompanyLoading ? (
        <PageLoader message="Loading company..." />
      ) : !companyId ? (
        <View className="px-4 pt-4">
          <View className="rounded-2xl bg-slate-50 px-5 py-5">
            <Text className="text-[16px] font-bold text-slate-800">
              No company selected
            </Text>
            <Text className="mt-1 text-[14px] leading-5 text-slate-500">
              Select a company first to view integrations.
            </Text>
          </View>
        </View>
      ) : integrationQuery.isLoading ? (
        <PageLoader message="Loading integration..." />
      ) : integrationQuery.isError ? (
        <PageError
          title="Could not load integration"
          description="Please check the connection and try again."
          onRetry={() => void integrationQuery.refetch()}
        />
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <View className="rounded-2xl border border-slate-200 bg-white p-5">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Link2 color="#134074" size={20} strokeWidth={2.2} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[16px] font-bold text-slate-900">
                  Tally ERP
                </Text>
                <Text className="mt-0.5 text-[13px] text-slate-500">
                  Manage your Tally integration details.
                </Text>
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-[12px] font-bold uppercase tracking-wide text-slate-500">
                API Key
              </Text>
              <View className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <Text numberOfLines={1} className="flex-1 font-mono text-[14px] text-slate-900">
                  {integrationQuery.data?.masked_key || "Not configured"}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isSendingEmail}
              onPress={() => void handleSendEmail()}
              className={`mt-5 flex-row items-center self-start rounded-xl border border-[#134074] px-4 py-3 ${isSendingEmail ? "opacity-50" : ""}`}
            >
              <Mail color="#134074" size={18} strokeWidth={2.2} />
              <Text className="ml-2 text-[14px] font-semibold text-[#134074]">
                {isSendingEmail ? "Sending..." : "Send API Key to Email"}
              </Text>
            </Pressable>

            <View className="mt-5 flex-row items-center">
              <View
                className={`h-2.5 w-2.5 rounded-full ${integrationQuery.data?.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`}
              />
              <Text className="ml-2 text-[14px] text-slate-700">
                Status: {getStatusLabel(integrationQuery.data?.status)}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
