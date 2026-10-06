import { ScrollView, Text, View } from "react-native";
import { Building2, Users } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";

import { PageError } from "@/components/feedback/PageError";
import { ScreenHeader } from "@/components/ScreenHeader";
import { usePartyByIdQuery } from "@/hooks/queries/partyQueries";

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View className="border-t border-slate-100 py-3"><Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</Text><Text className="mt-1 text-sm font-semibold text-slate-700">{value}</Text></View>;
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerQuery = usePartyByIdQuery(id, Boolean(id));
  const customer = customerQuery.data;

  if (customerQuery.isError) {
    return <PageError title="Could not load customer" description="Please try again." onRetry={() => void customerQuery.refetch()} />;
  }
  if (!customer) {
    return <View className="flex-1 items-center justify-center bg-slate-50"><Text className="text-slate-500">Loading customer…</Text></View>;
  }

  return <View className="flex-1 bg-slate-50">
    <ScreenHeader title="Customer Details" />
    <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 36 }}>
      <View className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-900/10">
        <View className="flex-row items-center"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-100"><Users color="#a16207" size={24} /></View><View className="ml-3 flex-1"><Text className="text-lg font-extrabold text-slate-900">{customer.partyName || "Untitled Customer"}</Text><Text className="mt-1 text-sm text-slate-500">{customer.partyType || "Customer"}</Text></View></View>
        <View className="mt-4 self-start rounded-full bg-blue-100 px-3 py-1"><Text className="text-xs font-bold text-blue-700">Tally imported · View only</Text></View>
      </View>
      <View className="mt-4 rounded-3xl bg-white px-5 shadow-sm shadow-slate-900/10">
        <DetailRow label="Mobile" value={customer.mobileNumber || "—"} />
        <DetailRow label="Email" value={customer.emailID || "—"} />
        <DetailRow label="GSTIN" value={customer.gstNo || "—"} />
        <DetailRow label="PAN" value={customer.panNo || "—"} />
      </View>
      <View className="mt-4 rounded-3xl bg-white px-5 shadow-sm shadow-slate-900/10">
        <DetailRow label="Billing address" value={customer.billingAddress || "—"} />
        <DetailRow label="Shipping address" value={customer.shippingAddress || "—"} />
        <DetailRow label="Location" value={[customer.state, customer.country].filter(Boolean).join(", ") || "—"} />
      </View>
      <View className="mt-4 flex-row rounded-2xl bg-slate-100 p-4"><Building2 color="#64748b" size={19} /><Text className="ml-2 flex-1 text-xs leading-5 text-slate-600">This Tally-imported customer is read-only. Edit and delete actions are intentionally unavailable.</Text></View>
    </ScrollView>
  </View>;
}
