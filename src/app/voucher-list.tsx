import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Field, PrimaryButton, SectionCard } from "@/components/vouchers/VoucherUi";
import { useVoucherListQuery } from "@/hooks/queries/voucherQueries";
import { useAppSelector } from "@/store/hooks";
import type { VoucherType } from "@/types/voucher";
import { getTodayDateString, getVoucherTypeLabel } from "@/utils/voucher";

export default function VoucherListScreen() {
  const params = useLocalSearchParams<{ voucherType?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const voucherType = (params.voucherType === "receipt" ? "receipt" : "saleOrder") as VoucherType;
  const [date, setDate] = useState(getTodayDateString());

  const voucherQuery = useVoucherListQuery(
    selectedCompany?._id ?? "",
    voucherType,
    date,
    Boolean(selectedCompany?._id),
  );

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title={`${getVoucherTypeLabel(voucherType)} List`}
        menuItems={[
          {
            label: voucherType === "saleOrder" ? "Create sale order" : "Create receipt",
            onPress: () =>
              router.push(voucherType === "saleOrder" ? "/sale-order-create" : "/receipt-create"),
          },
        ]}
      />

      {isCompanyLoading ? (
        <View className="px-4 pt-4">
          <Text className="text-[14px] text-slate-500">Loading company...</Text>
        </View>
      ) : !selectedCompany?._id ? (
        <View className="px-4 pt-4">
          <SectionCard title="No company selected">
            <Text className="text-[14px] text-slate-500">
              Select a company first to view vouchers.
            </Text>
          </SectionCard>
        </View>
      ) : voucherQuery.isError ? (
        <PageError
          title="Could not load vouchers"
          description="Please check the connection and try again."
          onRetry={() => void voucherQuery.refetch()}
        />
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <SectionCard
            title="Date Filter"
            description="The backend list uses a day range. Enter a date in YYYY-MM-DD format."
          >
            <Field
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
            <PrimaryButton
              label="Refresh List"
              secondary
              onPress={() => void voucherQuery.refetch()}
            />
          </SectionCard>

          {(voucherQuery.data?.vouchers ?? []).length === 0 ? (
            <SectionCard
              title="No vouchers found"
              description={`No ${getVoucherTypeLabel(voucherType).toLowerCase()} entries were returned for ${date}.`}
            />
          ) : (
            (voucherQuery.data?.vouchers ?? []).map((item) => (
              <SectionCard
                key={item._id}
                title={item.voucher_number || "Voucher"}
                description={item.party_name || "No party name"}
              >
                <Text className="text-[13px] text-slate-600">
                  Amount: {Number(item.amount || 0).toFixed(2)}
                </Text>
                <Text className="mt-1 text-[13px] text-slate-600">
                  Status: {item.status || "N/A"}
                </Text>
                <Text className="mt-1 text-[13px] text-slate-600">
                  Date: {item.date ? String(item.date).slice(0, 10) : "--"}
                </Text>
              </SectionCard>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
