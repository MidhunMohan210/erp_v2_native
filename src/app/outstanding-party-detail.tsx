import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Building2, FileText } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useInfinitePartyOutstandingQuery } from "@/hooks/queries/outstandingQueries";
import { usePartyByIdQuery } from "@/hooks/queries/partyQueries";
import { useAppSelector } from "@/store/hooks";
import type { OutstandingBill } from "@/types/outstanding";

type LedgerFilter = "ledger" | "receivable" | "payable";

function formatAmount(value: number | undefined): string {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(Number(value) || 0));
}

function formatDate(value?: string): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getSignedPendingAmount(bill: OutstandingBill): number {
  const amount = Number(bill.bill_pending_amt) || 0;
  const classification = bill.classification?.trim().toLowerCase();
  if (classification === "cr") return -Math.abs(amount);
  if (classification === "dr") return Math.abs(amount);
  return amount;
}

function OutstandingBillRow({ bill }: { bill: OutstandingBill }) {
  const value = getSignedPendingAmount(bill);
  const isCredit = value < 0;
  const classification = isCredit ? "CR" : "DR";
  const canOpenSale = bill.source === "sale" && Boolean(bill.billId);
  const canOpenReceipt = bill.source === "advance_receipt" && Boolean(bill.billId);
  const canOpenVoucher = canOpenSale || canOpenReceipt;
  const openVoucher = () => {
    if (canOpenSale) {
      router.push({ pathname: "/sale-detail", params: { id: bill.billId } });
      return;
    }
    if (canOpenReceipt) {
      router.push({ pathname: "/receipt-detail", params: { id: bill.billId } });
    }
  };

  return (
    <Pressable
      accessibilityRole={canOpenVoucher ? "button" : undefined}
      accessibilityLabel={canOpenVoucher ? `Open ${bill.bill_no || "voucher"}` : undefined}
      disabled={!canOpenVoucher}
      onPress={openVoucher}
      className="mb-2.5 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm active:opacity-80"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[14px] font-extrabold text-slate-800">{bill.bill_no || "Bill number unavailable"}</Text>
          <Text className="mt-1 text-[11px] text-slate-500">{formatDate(bill.bill_date)}</Text>
        </View>
        <View className="items-end">
          <Text className={`text-[15px] font-extrabold ${isCredit ? "text-rose-600" : "text-emerald-700"}`}>₹{formatAmount(value)}</Text>
          <View className={`mt-1 rounded-full px-2 py-0.5 ${isCredit ? "bg-rose-50" : "bg-emerald-50"}`}><Text className={`text-[9px] font-extrabold ${isCredit ? "text-rose-700" : "text-emerald-700"}`}>{classification}</Text></View>
        </View>
      </View>
      <View className="mt-3 flex-row border-t border-slate-100 pt-2.5">
        <View className="flex-1"><Text className="text-[10px] text-slate-400">Bill amount</Text><Text className="mt-0.5 text-[12px] font-bold text-slate-700">₹{formatAmount(bill.bill_amount)}</Text></View>
        <View className="flex-1"><Text className="text-[10px] text-slate-400">Pending amount</Text><Text className="mt-0.5 text-[12px] font-bold text-slate-700">₹{formatAmount(value)}</Text></View>
      </View>
    </Pressable>
  );
}

export default function OutstandingPartyDetailScreen() {
  const params = useLocalSearchParams<{ partyId?: string; partyName?: string }>();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const [ledgerType, setLedgerType] = useState<LedgerFilter>("ledger");
  const partyId = params.partyId ?? "";
  const companyId = selectedCompany?._id ?? "";
  const partyQuery = usePartyByIdQuery(partyId, Boolean(partyId));
  const billsQuery = useInfinitePartyOutstandingQuery({ partyId, cmp_id: companyId, enabled: Boolean(partyId) && Boolean(companyId) });
  const bills = useMemo(() => billsQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [], [billsQuery.data]);
  const filteredBills = useMemo(() => bills.filter((bill) => {
    const value = getSignedPendingAmount(bill);
    if (ledgerType === "receivable") return value > 0;
    if (ledgerType === "payable") return value < 0;
    return true;
  }), [bills, ledgerType]);
  const total = useMemo(() => filteredBills.reduce((sum, bill) => sum + getSignedPendingAmount(bill), 0), [filteredBills]);
  const partyName = params.partyName || partyQuery.data?.partyName || "Party";

  if (!partyId || !companyId) return <View className="flex-1 bg-white"><ScreenHeader title="Outstanding Details" /><View className="flex-1 items-center justify-center px-6"><Text className="text-[15px] font-bold text-slate-800">Outstanding details are unavailable</Text><Text className="mt-2 text-center text-[12px] text-slate-500">Select a company and open a party again.</Text></View></View>;
  if (billsQuery.isLoading) return <View className="flex-1 bg-white"><ScreenHeader title="Outstanding Details" /><PageLoader message="Loading outstanding bills..." /></View>;
  if (billsQuery.isError) return <View className="flex-1 bg-white"><ScreenHeader title="Outstanding Details" /><PageError title="Could not load outstanding bills" description="Please check the connection and try again." onRetry={() => void billsQuery.refetch()} /></View>;

  const isCredit = total < 0;
  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Outstanding Details" />
      <FlatList
        data={filteredBills}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 32, flexGrow: filteredBills.length === 0 ? 1 : undefined }}
        refreshing={billsQuery.isRefetching && !billsQuery.isFetchingNextPage}
        onRefresh={() => void billsQuery.refetch()}
        onEndReached={() => { if (billsQuery.hasNextPage && !billsQuery.isFetchingNextPage) void billsQuery.fetchNextPage(); }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={<View><View className="rounded-2xl bg-[#3f5c76] p-5"><View className="flex-row items-start"><View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Building2 color="#dbeafe" size={20} /></View><View className="ml-3 min-w-0 flex-1"><Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-blue-100">Party</Text><Text numberOfLines={1} className="mt-1 text-[18px] font-extrabold text-white">{partyName}</Text></View></View><View className="mt-5 flex-row items-end border-t border-white/15 pt-4"><View className="flex-1"><Text className="text-[10px] font-bold uppercase tracking-[1px] text-blue-100">Outstanding</Text><Text className="mt-1 text-[25px] font-extrabold text-white">₹{formatAmount(total)}</Text><Text className="mt-1 text-[11px] text-blue-100">{filteredBills.length} outstanding {filteredBills.length === 1 ? "bill" : "bills"}</Text></View><View className={`rounded-full px-3 py-1.5 ${isCredit ? "bg-rose-400/20" : "bg-emerald-400/20"}`}><Text className="text-[10px] font-extrabold text-white">{isCredit ? "CR" : "DR"}</Text></View></View></View><View className="mb-4 mt-3 flex-row rounded-xl bg-slate-200/80 p-1">{(["ledger", "receivable", "payable"] as LedgerFilter[]).map((filter) => { const label = filter === "ledger" ? "Ledger" : filter === "receivable" ? "Receivable" : "Payable"; const selected = ledgerType === filter; return <Pressable key={filter} onPress={() => setLedgerType(filter)} className={`flex-1 rounded-lg py-2.5 ${selected ? "bg-white" : ""}`}><Text className={`text-center text-[11px] font-extrabold ${selected ? "text-[#134074]" : "text-slate-500"}`}>{label}</Text></Pressable>; })}</View><Text className="mb-3 px-1 text-[15px] font-extrabold text-slate-900">Bills</Text></View>}
        ListEmptyComponent={<View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14"><FileText color="#64748b" size={26} /><Text className="mt-4 text-[15px] font-extrabold text-slate-800">No outstanding bills found</Text><Text className="mt-1 text-center text-[12px] leading-5 text-slate-500">There are no bills for this party and filter.</Text></View>}
        ListFooterComponent={billsQuery.isFetchingNextPage ? <View className="items-center py-5"><ActivityIndicator color="#134074" /></View> : filteredBills.length > 0 ? <Text className="py-5 text-center text-[11px] text-slate-400">{billsQuery.hasNextPage ? "Scroll to load more" : "End of bills"}</Text> : null}
        renderItem={({ item }) => <OutstandingBillRow bill={item} />}
      />
    </View>
  );
}
