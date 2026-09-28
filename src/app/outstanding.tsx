import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Search, Users } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfinitePartyListQuery } from "@/hooks/queries/partyQueries";
import { useAppSelector } from "@/store/hooks";
import type { Party } from "@/types/party";

type LedgerFilter = "ledger" | "receivable" | "payable";

const PAGE_SIZE = 20;

function formatAmount(value: number | undefined): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(value) || 0));
}

function getSignedOutstanding(party: Party): number {
  const amount = Number(party.totalOutstanding) || 0;
  const classification = party.classification?.trim().toLowerCase();

  if (classification === "cr") return -Math.abs(amount);
  if (classification === "dr") return Math.abs(amount);
  return amount;
}

function OutstandingPartyRow({ party }: { party: Party }) {
  const router = useRouter();
  const value = getSignedOutstanding(party);
  const classification = value < 0 ? "CR" : "DR";
  const isCredit = classification === "CR";
  const contact = party.mobileNumber || party.emailID || "No contact details";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open outstanding bills for ${party.partyName || "party"}`}
      onPress={() =>
        router.push({
          pathname: "/outstanding-party-detail",
          params: { partyId: party._id, partyName: party.partyName || "" },
        })
      }
      className="mb-2.5 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm active:opacity-80"
    >
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#134074]/10">
          <Users color="#134074" size={20} strokeWidth={2.2} />
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[14px] font-extrabold text-slate-800">
            {party.partyName || "Untitled Party"}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[11px] text-slate-500">
            {contact}
          </Text>
        </View>
        <View className="ml-3 items-end">
          <Text className={`text-[15px] font-extrabold ${isCredit ? "text-rose-600" : "text-emerald-700"}`}>
            ₹{formatAmount(value)}
          </Text>
          <View className={`mt-1 rounded-full px-2 py-0.5 ${isCredit ? "bg-rose-50" : "bg-emerald-50"}`}>
            <Text className={`text-[9px] font-extrabold ${isCredit ? "text-rose-700" : "text-emerald-700"}`}>
              {classification}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function OutstandingScreen() {
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const [search, setSearch] = useState("");
  const [ledgerType, setLedgerType] = useState<LedgerFilter>("ledger");
  const debouncedSearch = useDebouncedValue(search.trim(), 500);
  const companyId = selectedCompany?._id ?? "";
  const partiesQuery = useInfinitePartyListQuery({
    cmp_id: companyId,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    ledgerType,
    enabled: Boolean(companyId),
  });
  const parties = useMemo(
    () => partiesQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [partiesQuery.data],
  );
  const visibleParties = useMemo(
    () => parties.filter((party) => Math.abs(getSignedOutstanding(party)) > 0),
    [parties],
  );
  const totals = useMemo(() => {
    return visibleParties.reduce(
      (current, party) => {
        const value = getSignedOutstanding(party);
        if (value >= 0) current.receivable += value;
        else current.payable += Math.abs(value);
        return current;
      },
      { receivable: 0, payable: 0 },
    );
  }, [visibleParties]);

  if (!companyId) {
    return (
      <View className="flex-1 bg-white">
        <ScreenHeader title="Outstanding" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[16px] font-bold text-slate-800">No company selected</Text>
          <Text className="mt-2 text-center text-[13px] text-slate-500">Select a company to view outstanding balances.</Text>
        </View>
      </View>
    );
  }

  // Keep the controls on screen while a new filter or search result is loading.
  // Totals only represent data returned for the current query.
  const isSummaryLoading = partiesQuery.isLoading;
  const isListLoading = partiesQuery.isLoading;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Outstanding" />
      <View className="px-4 pt-3">
        <View className="rounded-2xl bg-[#3f5c76] p-5">
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-blue-100">Outstanding balances shown</Text>
          <View className="mt-3 flex-row">
            <View className="flex-1 border-r border-white/15">
              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-blue-100">Receivable</Text>
              {isSummaryLoading ? <ActivityIndicator className="mt-2 self-start" color="#ffffff" size="small" /> : <Text className="mt-1 text-[18px] font-extrabold text-white">₹{formatAmount(totals.receivable)}</Text>}
            </View>
            <View className="flex-1 pl-4">
              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-blue-100">Payable</Text>
              {isSummaryLoading ? <ActivityIndicator className="mt-2 self-start" color="#ffffff" size="small" /> : <Text className="mt-1 text-[18px] font-extrabold text-white">₹{formatAmount(totals.payable)}</Text>}
            </View>
          </View>
          <View className="mt-4 flex-row items-center border-t border-white/15 pt-3">
            <Text className="flex-1 text-[11px] font-semibold text-blue-100">Net outstanding</Text>
            {isSummaryLoading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text className="text-[14px] font-extrabold text-white">₹{formatAmount(totals.receivable - totals.payable)}</Text>}
          </View>
        </View>
        <View className="mt-4 flex-row items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-1">
          <Search color="#64748b" size={18} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search parties" placeholderTextColor="#94a3b8" className="ml-2 flex-1 py-3 text-[13px] text-slate-800" />
        </View>
        <View className="mb-4 mt-3 flex-row rounded-xl bg-slate-200/80 p-1">
          {(["ledger", "receivable", "payable"] as LedgerFilter[]).map((filter) => {
            const label = filter === "ledger" ? "Ledger" : filter === "receivable" ? "Receivable" : "Payable";
            const selected = ledgerType === filter;
            return <Pressable key={filter} onPress={() => setLedgerType(filter)} className={`flex-1 rounded-lg py-2.5 ${selected ? "bg-white" : ""}`}><Text className={`text-center text-[11px] font-extrabold ${selected ? "text-[#134074]" : "text-slate-500"}`}>{label}</Text></Pressable>;
          })}
        </View>
        <Text className="mb-3 px-1 text-[15px] font-extrabold text-slate-900">Parties</Text>
      </View>
      <FlatList
        data={visibleParties}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 0, paddingBottom: insets.bottom + 32, flexGrow: visibleParties.length === 0 ? 1 : undefined }}
        keyboardShouldPersistTaps="handled"
        refreshing={partiesQuery.isRefetching && !partiesQuery.isFetchingNextPage}
        onRefresh={() => void partiesQuery.refetch()}
        onEndReached={() => {
          if (partiesQuery.hasNextPage && !partiesQuery.isFetchingNextPage) void partiesQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          isListLoading ? (
            <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14">
              <ActivityIndicator color="#134074" size="large" />
              <Text className="mt-3 text-[13px] text-slate-500">Loading outstanding parties...</Text>
            </View>
          ) : partiesQuery.isError ? (
            <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14">
              <Text className="text-[15px] font-extrabold text-slate-800">Could not load outstanding</Text>
              <Text className="mt-2 text-center text-[12px] leading-5 text-slate-500">Please check the connection and try again.</Text>
              <Pressable accessibilityRole="button" onPress={() => void partiesQuery.refetch()} className="mt-5 rounded-xl bg-[#134074] px-4 py-2.5">
                <Text className="text-[12px] font-bold text-white">Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14"><Users color="#64748b" size={26} /><Text className="mt-4 text-[15px] font-extrabold text-slate-800">No outstanding transactions found</Text><Text className="mt-1 text-center text-[12px] leading-5 text-slate-500">{debouncedSearch ? "Try a different party name." : "There are no outstanding balances for this filter."}</Text></View>
          )
        }
        ListFooterComponent={partiesQuery.isFetchingNextPage ? <View className="items-center py-5"><ActivityIndicator color="#134074" /></View> : visibleParties.length > 0 ? <Text className="py-5 text-center text-[11px] text-slate-400">{partiesQuery.hasNextPage ? "Scroll to load more" : "End of parties"}</Text> : null}
        renderItem={({ item }) => <OutstandingPartyRow party={item} />}
      />
    </View>
  );
}
