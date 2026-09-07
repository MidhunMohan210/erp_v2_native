import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { isAxiosError } from "axios";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { RefreshCw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { VoucherEmptyState } from "@/components/voucher-create/VoucherEmptyState";
import { VoucherErrorState } from "@/components/voucher-create/VoucherErrorState";
import { VoucherLoadingState } from "@/components/voucher-create/VoucherLoadingState";
import { useSaleAuditQuery, useSalesForAuditQuery } from "@/hooks/queries/saleQueries";
import { useAppSelector } from "@/store/hooks";
import type { SaleAuditCheck, SaleAuditData } from "@/types/saleAudit";
import { AppText } from "@/components/ui/AppText";

type AuditSectionProps = {
  title: string;
  children: React.ReactNode;
};

type CheckSummaryProps = {
  label: string;
  check: SaleAuditCheck;
};

function formatCurrency(value: number | undefined): string {
  return `₹${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error ? error.message : "Unable to load Sale audit.";
}

function AuditSection({ title, children }: AuditSectionProps) {
  return (
    <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <AppText className="mb-3 text-base font-extrabold text-slate-900">{title}</AppText>
      {children}
    </View>
  );
}

function DetailRow({ label, value, debug = false }: { label: string; value: string; debug?: boolean }) {
  return (
    <View className="mb-2 flex-row justify-between gap-3">
      <AppText className="flex-1 text-xs text-slate-500">{label}</AppText>
      <AppText selectable className={`flex-1 text-right text-xs text-slate-800 ${debug ? "font-mono" : "font-semibold"}`}>
        {value}
      </AppText>
    </View>
  );
}

function CheckSummary({ label, check }: CheckSummaryProps) {
  const symbol = check.valid ? "✓" : "✕";
  return (
    <View className="mb-2">
      <AppText className={`text-sm font-bold ${check.valid ? "text-emerald-700" : "text-rose-700"}`}>
        {symbol} {label}{!check.valid && check.issues.length ? ` — ${check.issues.length} issue${check.issues.length === 1 ? "" : "s"}` : ""}
      </AppText>
    </View>
  );
}

function CheckIssues({ check }: { check: SaleAuditCheck }) {
  if (check.valid || check.issues.length === 0) return null;
  return (
    <View className="mt-2 rounded-xl bg-rose-50 p-3">
      {check.issues.map((issue, index) => (
        <AppText key={`${issue}-${index}`} className="mb-1 text-xs leading-5 text-rose-800">
          ✕ {issue}
        </AppText>
      ))}
    </View>
  );
}

function findItemName(data: SaleAuditData, itemId: string): string {
  return data.sale.items.find((item) => item.item_id === itemId)?.item_name ?? itemId;
}

function AuditContent({ data }: { data: SaleAuditData }) {
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);
  const partyName = data.sale.party_snapshot?.party_name ?? data.sale.party_snapshot?.name ?? data.sale.party_id;
  const allIssues = Object.values(data.checks)
    .filter((check): check is SaleAuditCheck => typeof check === "object" && check !== null && "issues" in check)
    .flatMap((check) => check.issues);

  return (
    <>
      <AuditSection title="Sale summary">
        <AppText className="text-lg font-extrabold text-[#134074]">{data.sale.voucher_number}</AppText>
        <AppText className="mt-1 text-sm font-semibold text-slate-800">{partyName}</AppText>
        <AppText className="mt-1 text-sm text-slate-600">{formatDate(data.sale.date)}</AppText>
        <AppText className="mt-2 text-xl font-extrabold text-slate-900">{formatCurrency(data.sale.totals.final_amount)}</AppText>
        <View className="mt-3 flex-row gap-2">
          <AppText className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Status: {data.sale.status}</AppText>
          <AppText className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Tally: {data.sale.tally_status}</AppText>
        </View>
      </AuditSection>

      <AuditSection title="Overall checks">
        <AppText className={`mb-3 text-sm font-extrabold ${data.checks.overallValid ? "text-emerald-700" : "text-rose-700"}`}>
          {data.checks.overallValid ? "All core checks passed" : "Issues found"}
        </AppText>
        <CheckSummary label="Item Ledger" check={data.checks.itemLedger} />
        <CheckSummary label="Monthly Balance" check={data.checks.itemMonthlyBalance} />
        <CheckSummary label="Party Ledger" check={data.checks.partyLedger} />
        <CheckSummary label="Outstanding" check={data.checks.outstanding} />
        <CheckSummary label="References" check={data.checks.references} />
        <CheckSummary label="Current Stock Rows" check={data.checks.stockRows} />
      </AuditSection>

      <AuditSection title="Sale items">
        {data.sale.items.map((item, index) => (
          <View key={item._id} className={index ? "mt-4 border-t border-slate-100 pt-4" : ""}>
            <AppText className="mb-2 text-sm font-extrabold text-slate-900">{item.item_name}</AppText>
            <DetailRow label="Sale item ID" value={item._id} debug />
            <DetailRow label="Item ID" value={item.item_id} debug />
            <DetailRow label="Actual qty" value={`${item.actual_qty} ${item.selected_unit}`} />
            <DetailRow label="Billed qty" value={`${item.billed_qty} ${item.selected_unit}`} />
            <DetailRow label="Godown" value={item.godown_name} />
            <DetailRow label="Godown ID" value={item.godown_id} debug />
            <DetailRow label="Godown stock row ID" value={item.godown_stock_row_id} debug />
            <DetailRow label="Batch" value={item.batch ?? "—"} />
            <DetailRow label="Rate" value={formatCurrency(item.rate)} />
            <DetailRow label="Total amount" value={formatCurrency(item.total_amount)} />
          </View>
        ))}
      </AuditSection>

      <AuditSection title="Item ledger">
        {data.itemLedgers.length === 0 ? <VoucherEmptyState message="No ItemLedger rows were returned." /> : data.itemLedgers.map((ledger, index) => (
          <View key={ledger._id} className={index ? "mt-4 border-t border-slate-100 pt-4" : ""}>
            <AppText className="mb-2 text-sm font-extrabold text-slate-900">{ledger.saleItem?.item_name ?? findItemName(data, ledger.item_id)}</AppText>
            <DetailRow label="Sale item reference" value={ledger.voucher_item_id} debug />
            <DetailRow label="Movement" value={ledger.movement_type} />
            <DetailRow label="Quantity" value={`${ledger.base_quantity} ${ledger.base_unit}`} />
            <DetailRow label="Godown" value={ledger.saleItem?.godown_name ?? ledger.godown_id} />
            <DetailRow label="Godown stock row ID" value={ledger.godown_stock_row_id} debug />
            <DetailRow label="Batch" value={ledger.batch ?? "—"} />
            <DetailRow label="Status" value={ledger.status ?? "—"} />
            <DetailRow label="Tally status" value={ledger.tally_status} />
          </View>
        ))}
        <CheckIssues check={data.checks.itemLedger} />
      </AuditSection>

      <AuditSection title="Item monthly balance">
        {data.itemMonthlyBalances.map((balance, index) => (
          <View key={balance.itemId} className={index ? "mt-4 border-t border-slate-100 pt-4" : ""}>
            <AppText className="mb-2 text-sm font-extrabold text-slate-900">{findItemName(data, balance.itemId)}</AppText>
            <DetailRow label="Month" value={balance.monthKey} />
            <DetailRow label="This Sale contribution" value={`${balance.thisSaleContribution.outwardQuantity} Nos`} />
            <DetailRow label="Current monthly outward" value={balance.currentMonthlyBalance ? `${balance.currentMonthlyBalance.total_outward_qty} Nos` : "No monthly balance row"} />
          </View>
        ))}
        <CheckIssues check={data.checks.itemMonthlyBalance} />
      </AuditSection>

      <AuditSection title="Party ledger">
        {data.partyLedgers.length === 0 ? <VoucherEmptyState message="No PartyLedger rows were returned for this Sale." /> : data.partyLedgers.map((ledger) => (
          <View key={ledger._id}>
            <DetailRow label="Party" value={ledger.party_name} />
            <DetailRow label="Ledger side" value={ledger.ledger_side} />
            <DetailRow label="Amount" value={formatCurrency(ledger.amount)} />
            <DetailRow label="Voucher reference" value={ledger.voucher_number} />
            <DetailRow label="Status" value={ledger.status} />
            <DetailRow label="Tally status" value={ledger.tally_status} />
            <DetailRow label="Sale final amount" value={formatCurrency(data.sale.totals.final_amount)} />
          </View>
        ))}
        <CheckIssues check={data.checks.partyLedger} />
      </AuditSection>

      <AuditSection title="Party monthly balance">
        {data.partyMonthlyBalances.map((balance) => (
          <View key={balance.partyId}>
            <DetailRow label="Party" value={partyName} />
            <DetailRow label="Month" value={balance.monthKey} />
            <DetailRow label="This Sale contribution" value={formatCurrency(balance.thisSaleContribution.debit)} />
            <DetailRow label="Current month debit" value={balance.currentMonthlyBalance ? formatCurrency(balance.currentMonthlyBalance.total_debit) : "No monthly balance row"} />
          </View>
        ))}
        <CheckIssues check={data.checks.partyMonthlyBalance} />
      </AuditSection>

      <AuditSection title="Outstanding">
        {data.outstanding.length === 0 ? <VoucherEmptyState message="No Outstanding rows were returned." /> : data.outstanding.map((record) => (
          <View key={record._id}>
            <DetailRow label="Bill amount" value={formatCurrency(record.bill_amount)} />
            <DetailRow label="Received / adjusted" value={formatCurrency(record.adjustedAmount)} />
            <DetailRow label="Current balance" value={formatCurrency(record.bill_pending_amt)} />
            <DetailRow label="Status" value={record.isCancelled ? "Cancelled" : "Active"} />
            <DetailRow label="Sale / voucher reference" value={record.bill_no} />
            <DetailRow label="Sale final amount" value={formatCurrency(data.sale.totals.final_amount)} />
          </View>
        ))}
        <CheckIssues check={data.checks.outstanding} />
      </AuditSection>

      <AuditSection title="Voucher timeline">
        {data.voucherTimeline.length === 0 ? <VoucherEmptyState message="No VoucherTimeline entries were returned." /> : data.voucherTimeline.map((entry, index) => (
          <View key={entry._id} className={index ? "mt-3 border-t border-slate-100 pt-3" : ""}>
            <AppText className="text-sm font-bold text-slate-900">{entry.voucher_number}</AppText>
            <AppText className="mt-1 text-xs text-slate-600">{formatDate(entry.date)} · {entry.party_name ?? "No party"} · {formatCurrency(entry.amount)}</AppText>
            <AppText className="mt-1 text-xs text-slate-500">Status: {entry.status ?? "—"}</AppText>
          </View>
        ))}
        <CheckIssues check={data.checks.references} />
      </AuditSection>

      <AuditSection title="Current stock rows">
        {data.stockRows.map((row, index) => {
          const stock = row.currentStockRow?.balance_stock ?? row.currentStockRow?.stock ?? row.currentStockRow?.stock_balance ?? row.currentStockRow?.current_stock;
          return (
            <View key={row.saleItemId} className={index ? "mt-4 border-t border-slate-100 pt-4" : ""}>
              <AppText className="mb-2 text-sm font-extrabold text-slate-900">{row.item_name}</AppText>
              <DetailRow label="Godown" value={row.godown_name} />
              <DetailRow label="Batch" value={row.batch ?? "—"} />
              <DetailRow label="Godown stock row ID" value={row.godown_stock_row_id} debug />
              <DetailRow label="Current stock" value={stock === undefined ? "Not provided" : `${stock} Nos`} />
              <DetailRow label="Sale actual qty" value={`${row.saleActualQty} Nos`} />
            </View>
          );
        })}
        <CheckIssues check={data.checks.stockRows} />
      </AuditSection>

      {allIssues.length > 0 ? (
        <AuditSection title="Issues found">
          {allIssues.map((issue, index) => <AppText key={`${issue}-${index}`} selectable className="mb-2 text-sm leading-5 text-rose-800">{index + 1}. {issue}</AppText>)}
        </AuditSection>
      ) : null}

      <AuditSection title="Raw audit JSON">
        <Pressable onPress={() => setIsRawDataOpen((current) => !current)} className="self-start rounded-lg bg-slate-100 px-3 py-2">
          <AppText className="text-xs font-bold text-[#134074]">{isRawDataOpen ? "Hide raw data" : "Show raw data"}</AppText>
        </Pressable>
        {isRawDataOpen ? <AppText selectable className="mt-3 font-mono text-[10px] leading-4 text-slate-700">{JSON.stringify(data, null, 2)}</AppText> : null}
      </AuditSection>
    </>
  );
}

export default function SaleTransactionAuditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ saleId?: string | string[] }>();
  const saleId = Array.isArray(params.saleId) ? params.saleId[0] : params.saleId ?? "";
  const companyId = useAppSelector((state) => state.company.selectedCompany?._id ?? "");
  const auditQuery = useSaleAuditQuery(companyId, saleId, __DEV__ && Boolean(companyId && saleId));
  const salesListQuery = useSalesForAuditQuery(companyId, __DEV__ && Boolean(companyId) && !saleId);
  const sales = salesListQuery.data?.pages.flatMap((page) => page.vouchers) ?? [];

  // The API exists only in backend development mode. Do not expose this route in release builds.
  if (!__DEV__) return <Redirect href="/(app)/home" />;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Sale Transaction Audit"
        rightContent={<Pressable onPress={() => void (saleId ? auditQuery.refetch() : salesListQuery.refetch())} disabled={saleId ? auditQuery.isFetching : salesListQuery.isFetching} className="h-9 w-9 items-center justify-center"><RefreshCw color="#134074" size={20} strokeWidth={2.4} /></Pressable>}
      />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {!saleId ? (
          <View className="mt-4">
            <AppText className="mb-1 text-base font-extrabold text-slate-900">Select a Sale</AppText>
            <AppText className="mb-3 text-xs leading-5 text-slate-600">Choose a Sale to inspect its posting records. Newest Sales appear first.</AppText>
            {salesListQuery.isLoading ? <VoucherLoadingState message="Loading Sales..." /> : null}
            {salesListQuery.isError ? <VoucherErrorState message={getErrorMessage(salesListQuery.error)} onRetry={() => void salesListQuery.refetch()} /> : null}
            {!salesListQuery.isLoading && !salesListQuery.isError && sales.length === 0 ? <VoucherEmptyState message="No Sales were found for this company." /> : null}
            {sales.map((sale) => (
              <Pressable key={sale._id} onPress={() => router.push({ pathname: "/sale-transaction-audit", params: { saleId: sale._id } })} className="mb-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="min-w-0 flex-1">
                    <AppText numberOfLines={1} className="text-sm font-extrabold text-slate-900">{sale.voucher_number ?? "Sale"}</AppText>
                    <AppText numberOfLines={1} className="mt-1 text-xs font-semibold text-slate-600">{sale.party_name ?? "No party"}</AppText>
                    <AppText className="mt-1 text-xs text-slate-500">{sale.date ? formatDate(sale.date) : "—"} · {sale.status ?? "—"}</AppText>
                  </View>
                  <AppText className="text-sm font-extrabold text-slate-900">{formatCurrency(sale.amount)}</AppText>
                </View>
              </Pressable>
            ))}
            {salesListQuery.hasNextPage ? <Pressable onPress={() => void salesListQuery.fetchNextPage()} disabled={salesListQuery.isFetchingNextPage} className="my-3 items-center rounded-xl bg-slate-100 px-4 py-3"><AppText className="text-xs font-bold text-[#134074]">{salesListQuery.isFetchingNextPage ? "Loading Sales..." : "Load more Sales"}</AppText></Pressable> : null}
            {salesListQuery.isFetchingNextPage ? <ActivityIndicator color="#134074" /> : null}
          </View>
        ) : null}
        {saleId && !companyId ? <View className="mt-4"><VoucherEmptyState message="Select a company before opening a Sale audit." /></View> : null}
        {auditQuery.isLoading ? <View className="mt-4"><VoucherLoadingState message="Loading Sale transaction audit..." /></View> : null}
        {auditQuery.isError ? <View className="mt-4"><VoucherErrorState message={getErrorMessage(auditQuery.error)} onRetry={() => void auditQuery.refetch()} /></View> : null}
        {auditQuery.data?.data ? <AuditContent data={auditQuery.data.data} /> : null}
      </ScrollView>
    </View>
  );
}
