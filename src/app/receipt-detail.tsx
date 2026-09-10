import { ScrollView, Text, View } from "react-native";
import type { ReactNode } from "react";
import { FileText, Landmark, UserRound } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useReceiptDetailQuery } from "@/hooks/queries/receiptQueries";
import { useAppSelector } from "@/store/hooks";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value: number): string {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text className="flex-1 text-[12px] text-slate-500">{label}</Text>
      <Text className="max-w-[58%] text-right text-[12px] font-semibold text-slate-800">
        {value}
      </Text>
    </View>
  );
}

type DetailCardProps = {
  title: string;
  children: ReactNode;
};

function DetailCard({ title, children }: DetailCardProps) {
  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-[14px] font-extrabold text-slate-900">{title}</Text>
      <View className="mt-2">{children}</View>
    </View>
  );
}

export default function ReceiptDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const receiptId = params.id ?? "";
  const companyId = selectedCompany?._id ?? "";
  const receiptQuery = useReceiptDetailQuery(receiptId, companyId);

  if (!receiptId || !companyId) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Receipt Details" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[15px] font-bold text-slate-800">Receipt is not available</Text>
          <Text className="mt-2 text-center text-[12px] text-slate-500">
            Open the receipt again from Home or Daybook.
          </Text>
        </View>
      </View>
    );
  }

  if (receiptQuery.isLoading) {
    return <View className="flex-1 bg-white"><ScreenHeader title="Receipt Details" /><PageLoader message="Loading receipt..." /></View>;
  }

  if (receiptQuery.isError || !receiptQuery.data) {
    return <View className="flex-1 bg-white"><ScreenHeader title="Receipt Details" /><PageError title="Could not load receipt" description="The receipt may be unavailable or you may not have access." onRetry={() => void receiptQuery.refetch()} /></View>;
  }

  const receipt = receiptQuery.data;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Receipt Details" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-3 rounded-[15px] bg-[#3f5c76] p-5">
          <View className="flex-row items-start justify-between gap-4">
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-blue-200">Receipt</Text>
              <Text className="mt-1 text-[22px] font-extrabold text-white">{receipt.voucher_number}</Text>
              <Text className="mt-2 text-[12px] text-blue-100">{formatDate(receipt.date)}</Text>
            </View>
            <View className={`rounded-full px-3 py-1.5 ${receipt.status === "cancelled" ? "bg-rose-100" : "bg-emerald-100"}`}>
              <Text className={`text-[10px] font-extrabold uppercase ${receipt.status === "cancelled" ? "text-rose-700" : "text-emerald-700"}`}>{receipt.status}</Text>
            </View>
          </View>
          <View className="mt-5 border-t border-slate-500 pt-4">
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-blue-200">Received amount</Text>
            <Text className="mt-1 text-[25px] font-extrabold text-white">{formatAmount(receipt.amount)}</Text>
          </View>
        </View>

        <DetailCard title="Party"><View className="flex-row items-center"><UserRound color="#134074" size={17} /><Text className="ml-2 text-[13px] font-bold text-slate-900">{receipt.party_name || "--"}</Text></View></DetailCard>
        <DetailCard title="Deposit account"><View className="flex-row items-center"><Landmark color="#134074" size={17} /><Text className="ml-2 text-[13px] font-bold text-slate-900">{receipt.cash_bank_name || "--"}</Text></View><DetailRow label="Account type" value={receipt.cash_bank_type} /><DetailRow label="Instrument" value={receipt.instrument_type.toUpperCase()} /></DetailCard>
        <DetailCard title="Settlement"><DetailRow label="Advance amount" value={formatAmount(receipt.advance_amount ?? 0)} /><DetailRow label="Bills settled" value={String(receipt.settlement_details?.length ?? 0)} /></DetailCard>
        {receipt.narration?.trim() ? <DetailCard title="Narration"><View className="flex-row"><FileText color="#134074" size={17} /><Text className="ml-2 flex-1 text-[12px] leading-5 text-slate-600">{receipt.narration.trim()}</Text></View></DetailCard> : null}
      </ScrollView>
    </View>
  );
}
