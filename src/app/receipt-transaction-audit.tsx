import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { RefreshCw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { AppText } from "@/components/ui/AppText";
import { ScreenHeader } from "@/components/ScreenHeader";
import { VoucherEmptyState } from "@/components/voucher-create/VoucherEmptyState";
import { VoucherErrorState } from "@/components/voucher-create/VoucherErrorState";
import { VoucherLoadingState } from "@/components/voucher-create/VoucherLoadingState";
import { receiptAuditQueryKeys, useReceiptAuditQuery, useReceiptsForAuditQuery, useResetAllTransactionsMutation } from "@/hooks/queries/receiptQueries";
import { useAppSelector } from "@/store/hooks";
import type { ReceiptAuditCheck, ReceiptAuditData } from "@/types/receiptAudit";

function formatCurrency(value: number): string { return `₹${Number(value).toFixed(2)}`; }
function formatDate(value?: string): string { return value ? new Date(value).toLocaleDateString("en-IN") : "—"; }
function errorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) return error.response.data.message;
  return error instanceof Error ? error.message : "Unable to load Receipt audit.";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><AppText className="mb-3 text-base font-extrabold text-slate-900">{title}</AppText>{children}</View>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <View className="mb-2 flex-row justify-between gap-3"><AppText className="flex-1 text-xs text-slate-500">{label}</AppText><AppText selectable className="flex-1 text-right text-xs font-semibold text-slate-800">{value}</AppText></View>;
}
function Check({ label, check }: { label: string; check: ReceiptAuditCheck }) {
  return <View className="mb-2"><AppText className={`text-sm font-bold ${check.valid ? "text-emerald-700" : "text-rose-700"}`}>{check.valid ? "✓" : "✕"} {label}</AppText>{check.issues.map((issue) => <AppText key={issue} className="mt-1 text-xs text-rose-700">{issue}</AppText>)}</View>;
}
function AuditContent({ data }: { data: ReceiptAuditData }) {
  const [showJson, setShowJson] = useState(false);
  const receipt = data.receipt;
  return <>
    <Section title="Receipt summary">
      <AppText className="text-lg font-extrabold text-[#134074]">{receipt.voucher_number}</AppText>
      <AppText className="mt-1 text-sm font-semibold text-slate-800">{receipt.party_name}</AppText>
      <Row label="Date" value={formatDate(receipt.date)} /><Row label="Cash / bank" value={receipt.cash_bank_name} />
      <Row label="Amount" value={formatCurrency(receipt.amount)} /><Row label="Status" value={receipt.status} />
    </Section>
    <Section title="Overall checks">
      <AppText className={`mb-3 text-sm font-extrabold ${data.checks.overallValid ? "text-emerald-700" : "text-rose-700"}`}>{data.checks.overallValid ? "All checks passed" : "Issues found"}</AppText>
      <Check label="Party ledger" check={data.checks.partyLedger} /><Check label="Cash / bank ledger" check={data.checks.cashBankLedger} />
      <Check label="Party monthly balance" check={data.checks.partyMonthlyBalance} /><Check label="Settlement snapshots" check={data.checks.settlements} />
      <Check label="Advance outstanding" check={data.checks.advanceOutstanding} /><Check label="Voucher timeline" check={data.checks.references} />
      <Check label="Voucher identity" check={data.checks.voucherIdentity} />
    </Section>
    <Section title="Posting details">
      <Row label="Party ledger rows" value={String(data.partyLedgers.length)} /><Row label="Cash / bank rows" value={String(data.cashBankLedgers.length)} />
      <Row label="Settlement rows" value={String(data.settlements.length)} /><Row label="Advance rows" value={String(data.advanceOutstanding.length)} />
      <Row label="Timeline rows" value={String(data.voucherTimeline.length)} />
      {data.partyMonthlyBalance ? <><Row label="Monthly credit" value={formatCurrency(data.partyMonthlyBalance.total_credit)} /><Row label="Monthly transactions" value={String(data.partyMonthlyBalance.transaction_count)} /></> : null}
    </Section>
    <Section title="Raw audit JSON">
      <View className="flex-row gap-2"><Pressable onPress={() => setShowJson((value) => !value)} className="rounded-lg bg-slate-100 px-3 py-2"><AppText className="text-xs font-bold text-[#134074]">{showJson ? "Hide JSON" : "Show JSON"}</AppText></Pressable><Pressable onPress={() => void Clipboard.setStringAsync(JSON.stringify(data, null, 2)).then(() => toast.success("Audit JSON copied"))} className="rounded-lg bg-[#134074] px-3 py-2"><AppText className="text-xs font-bold text-white">Copy JSON</AppText></Pressable></View>
      {showJson ? <AppText selectable className="mt-3 font-mono text-[10px] leading-4 text-slate-700">{JSON.stringify(data, null, 2)}</AppText> : null}
    </Section>
  </>;
}

export default function ReceiptTransactionAuditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ receiptId?: string | string[] }>();
  const receiptId = Array.isArray(params.receiptId) ? params.receiptId[0] : params.receiptId ?? "";
  const companyId = useAppSelector((state) => state.company.selectedCompany?._id ?? "");
  const auditQuery = useReceiptAuditQuery(companyId, receiptId, __DEV__ && Boolean(companyId && receiptId));
  const listQuery = useReceiptsForAuditQuery(companyId, __DEV__ && Boolean(companyId) && !receiptId);
  const resetMutation = useResetAllTransactionsMutation();
  const receipts = listQuery.data?.pages.flatMap((page) => page.vouchers) ?? [];
  if (!__DEV__) return <Redirect href="/(app)/home" />;
  const refresh = () => void (receiptId ? auditQuery.refetch() : listQuery.refetch());
  const resetTransactions = () => {
    if (!companyId || resetMutation.isPending) return;
    Alert.alert("Delete all transactions?", "This permanently deletes every Sale, Sale Order, Receipt, ledger, monthly balance, Outstanding, timeline, and runtime counter for the selected company. Masters and Voucher Series stay. Product stock resets to 100.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete all", style: "destructive", onPress: () => void resetMutation.mutateAsync(companyId).then(() => { queryClient.clear(); router.replace("/receipt-transaction-audit"); }).catch((error) => Alert.alert("Reset failed", errorMessage(error))) },
    ]);
  };
  return <View className="flex-1 bg-slate-50">
    <ScreenHeader title="Receipt Transaction Audit" rightContent={<Pressable onPress={refresh} className="h-9 w-9 items-center justify-center"><RefreshCw color="#134074" size={20} /></Pressable>} />
    <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <Section title="Development diagnostic">
        <AppText className="text-xs leading-5 text-slate-600">Read-only inspection of Receipt postings. This screen cannot repair, cancel, create, or reset anything.</AppText>
        <Pressable onPress={resetTransactions} disabled={!companyId || resetMutation.isPending} className="mt-3 items-center rounded-xl bg-rose-700 px-4 py-3 disabled:opacity-50"><AppText className="text-sm font-bold text-white">{resetMutation.isPending ? "Deleting transactions..." : "Delete All Transactions"}</AppText></Pressable>
      </Section>
      {!receiptId ? <View className="mt-4"><AppText className="mb-3 text-base font-extrabold text-slate-900">Select a Receipt</AppText>{listQuery.isLoading ? <VoucherLoadingState message="Loading Receipts..." /> : null}{listQuery.isError ? <VoucherErrorState message={errorMessage(listQuery.error)} onRetry={refresh} /> : null}{!listQuery.isLoading && !listQuery.isError && receipts.length === 0 ? <VoucherEmptyState message="No Receipts were found for this company." /> : null}{receipts.map((receipt) => <Pressable key={receipt._id} onPress={() => router.push({ pathname: "/receipt-transaction-audit", params: { receiptId: receipt._id } })} className="mb-2 rounded-2xl border border-slate-200 bg-white p-4"><View className="flex-row justify-between gap-3"><View className="flex-1"><AppText className="text-sm font-extrabold text-slate-900">{receipt.voucher_number ?? "Receipt"}</AppText><AppText className="mt-1 text-xs font-semibold text-slate-600">{receipt.party_name ?? "No party"}</AppText><AppText className="mt-1 text-xs text-slate-500">{formatDate(receipt.date)} · {receipt.status ?? "—"}</AppText></View><AppText className="text-sm font-extrabold text-slate-900">{formatCurrency(receipt.amount ?? 0)}</AppText></View></Pressable>)}{listQuery.hasNextPage ? <Pressable onPress={() => void listQuery.fetchNextPage()} className="my-3 items-center rounded-xl bg-slate-100 p-3"><AppText className="text-xs font-bold text-[#134074]">Load more Receipts</AppText></Pressable> : null}{listQuery.isFetchingNextPage ? <ActivityIndicator color="#134074" /> : null}</View> : null}
      {receiptId && !companyId ? <VoucherEmptyState message="Select a company before opening a Receipt audit." /> : null}
      {auditQuery.isLoading ? <VoucherLoadingState message="Loading Receipt transaction audit..." /> : null}
      {auditQuery.isError ? <VoucherErrorState message={errorMessage(auditQuery.error)} onRetry={refresh} /> : null}
      {auditQuery.data?.data ? <AuditContent data={auditQuery.data.data} /> : null}
    </ScrollView>
  </View>;
}
