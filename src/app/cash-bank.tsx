import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Landmark, Wallet } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCashBankLedgerBalancesQuery } from "@/hooks/queries/cashBankQueries";
import { useAppSelector } from "@/store/hooks";
import type { CashBankBalance } from "@/services/cashTransaction.service";

type BalanceFilter = "all" | "cash" | "bank";

const EMPTY_ACCOUNTS: CashBankBalance[] = [];

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
}

function AccountRow({ account }: { account: CashBankBalance }) {
  const router = useRouter();
  const isCash = account.cash_bank_type === "cash";
  const balance = Number(account.current_balance) || 0;
  const isNegative = balance < 0;
  const canOpenHistory = Boolean(account._id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${canOpenHistory ? "Open" : "View"} ${account.cash_bank_name || "account"}`}
      disabled={!canOpenHistory}
      onPress={() => router.push({ pathname: "/cash-bank-account", params: { id: account._id || "" } })}
      className="mb-2.5 flex-row items-center rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm active:opacity-80"
    >
      <View className={`h-10 w-10 items-center justify-center rounded-xl ${isCash ? "bg-emerald-50" : "bg-sky-50"}`}>
        {isCash ? <Wallet color="#047857" size={20} strokeWidth={2.2} /> : <Landmark color="#0369a1" size={20} strokeWidth={2.2} />}
      </View>
      <View className="ml-3 min-w-0 flex-1">
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className="flex-shrink text-[14px] font-extrabold text-slate-800"
        >
          {account.cash_bank_name || "Unnamed account"}
        </Text>
        <Text className="mt-1 text-[11px] text-slate-500">{isCash ? "Cash account" : "Bank account"}</Text>
      </View>
      <View className="ml-3 items-end">
        <Text className={`text-[15px] font-extrabold ${isNegative ? "text-rose-600" : "text-slate-800"}`}>{isNegative ? "−" : ""}₹{formatAmount(balance)}</Text>
        <Text className="mt-1 text-[9px] font-bold text-slate-400">Current balance</Text>
      </View>
    </Pressable>
  );
}

export default function CashBankScreen() {
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const [filter, setFilter] = useState<BalanceFilter>("all");
  const companyId = selectedCompany?._id ?? "";
  const cashQuery = useCashBankLedgerBalancesQuery(companyId, "cash", Boolean(companyId));
  const bankQuery = useCashBankLedgerBalancesQuery(companyId, "bank", Boolean(companyId));
  const cashAccounts = cashQuery.data ?? EMPTY_ACCOUNTS;
  const bankAccounts = bankQuery.data ?? EMPTY_ACCOUNTS;
  const accounts = useMemo(() => {
    if (filter === "cash") return cashAccounts;
    if (filter === "bank") return bankAccounts;
    return [...cashAccounts, ...bankAccounts];
  }, [bankAccounts, cashAccounts, filter]);
  const cashTotal = useMemo(() => cashAccounts.reduce((total, account) => total + (Number(account.current_balance) || 0), 0), [cashAccounts]);
  const bankTotal = useMemo(() => bankAccounts.reduce((total, account) => total + (Number(account.current_balance) || 0), 0), [bankAccounts]);
  const selectedTotal = filter === "cash" ? cashTotal : filter === "bank" ? bankTotal : cashTotal + bankTotal;
  const isLoading = cashQuery.isLoading || bankQuery.isLoading;
  const isError = cashQuery.isError || bankQuery.isError;

  if (isCompanyLoading) return <PageLoader message="Loading company..." />;
  if (!companyId) return <View className="flex-1 bg-white"><ScreenHeader title="Cash / Bank" /><View className="flex-1 items-center justify-center px-6"><Text className="text-[16px] font-bold text-slate-800">No company selected</Text><Text className="mt-2 text-center text-[13px] text-slate-500">Select a company to view cash and bank balances.</Text></View></View>;
  if (isLoading) return <View className="flex-1 bg-white"><ScreenHeader title="Cash / Bank" /><PageLoader message="Loading cash and bank balances..." /></View>;
  if (isError) return <View className="flex-1 bg-white"><ScreenHeader title="Cash / Bank" /><PageError title="Could not load cash / bank balances" description="Please check the connection and try again." onRetry={() => { void cashQuery.refetch(); void bankQuery.refetch(); }} /></View>;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Cash / Bank" />
      <FlatList
        data={accounts}
        keyExtractor={(item, index) => `${item.cash_bank_type}-${item._id ?? index}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 32, flexGrow: accounts.length === 0 ? 1 : undefined }}
        refreshing={cashQuery.isRefetching || bankQuery.isRefetching}
        onRefresh={() => { void cashQuery.refetch(); void bankQuery.refetch(); }}
        ListHeaderComponent={<View><View className="rounded-2xl bg-[#3f5c76] p-5"><Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-blue-100">{filter === "cash" ? "Cash balance" : filter === "bank" ? "Bank balance" : "Combined balance"}</Text><Text className="mt-2 text-[28px] font-extrabold text-white">{selectedTotal < 0 ? "−" : ""}₹{formatAmount(selectedTotal)}</Text><View className="mt-4 flex-row border-t border-white/15 pt-3"><View className="flex-1 border-r border-white/15"><Text className="text-[10px] font-bold uppercase tracking-[1px] text-blue-100">Cash</Text><Text className="mt-1 text-[15px] font-extrabold text-white">₹{formatAmount(cashTotal)}</Text></View><View className="flex-1 pl-4"><Text className="text-[10px] font-bold uppercase tracking-[1px] text-blue-100">Bank</Text><Text className="mt-1 text-[15px] font-extrabold text-white">₹{formatAmount(bankTotal)}</Text></View></View></View><View className="mb-4 mt-3 flex-row rounded-xl bg-slate-200/80 p-1">{(["all", "cash", "bank"] as BalanceFilter[]).map((item) => { const selected = filter === item; return <Pressable key={item} onPress={() => setFilter(item)} className={`flex-1 rounded-lg py-2.5 ${selected ? "bg-white" : ""}`}><Text className={`text-center text-[11px] font-extrabold ${selected ? "text-[#134074]" : "text-slate-500"}`}>{item === "all" ? "All" : item === "cash" ? "Cash" : "Bank"}</Text></Pressable>; })}</View><View className="mb-3 flex-row items-center justify-between px-1"><Text className="text-[15px] font-extrabold text-slate-900">Accounts</Text><Text className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600">{accounts.length} {accounts.length === 1 ? "account" : "accounts"}</Text></View></View>}
        ListEmptyComponent={<View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14"><Wallet color="#64748b" size={26} /><Text className="mt-4 text-[15px] font-extrabold text-slate-800">No accounts found</Text><Text className="mt-1 text-center text-[12px] leading-5 text-slate-500">There are no {filter === "all" ? "cash or bank" : filter} accounts for this company.</Text></View>}
        renderItem={({ item }) => <AccountRow account={item} />}
      />
    </View>
  );
}
