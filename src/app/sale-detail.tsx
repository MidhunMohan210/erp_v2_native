import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ban, Box, Calculator, Pencil, Printer, ReceiptText, Truck, UserRound } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { saleDetailQueryKeys } from "@/hooks/queries/saleQueries";
import { useAppSelector } from "@/store/hooks";
import type { SaleDetail } from "@/types/sale";

type DetailCardProps = { title: string; icon: ReactNode; children: ReactNode };
type DetailRowProps = { label: string; value: string; strong?: boolean };

function formatAmount(value?: number | null) { return `Rs. ${Number(value ?? 0).toFixed(2)}`; }
function formatQuantity(value?: number | null) { return Number(value ?? 0).toString(); }
function formatPercent(value?: number | null) { return Number(value ?? 0).toString(); }
function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function DetailCard({ title, icon, children }: DetailCardProps) {
  return <View className="mb-3 overflow-hidden rounded-[20px] border border-slate-200 bg-white"><View className="flex-row items-center border-b border-slate-100 px-4 py-3"><View className="h-8 w-8 items-center justify-center rounded-xl bg-blue-50">{icon}</View><Text className="ml-2.5 text-[14px] font-extrabold text-slate-900">{title}</Text></View><View className="p-4">{children}</View></View>;
}

function DetailRow({ label, value, strong = false }: DetailRowProps) {
  return <View className="flex-row items-start justify-between gap-4 py-1.5"><Text className={`flex-1 text-[12px] ${strong ? "font-extrabold text-slate-900" : "text-slate-500"}`}>{label}</Text><Text className={`max-w-[58%] text-right text-[12px] ${strong ? "font-extrabold text-slate-950" : "font-semibold text-slate-800"}`}>{value}</Text></View>;
}

function DisabledAction({ label, icon }: { label: string; icon: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label} sale`} disabled className="flex-1 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-2 py-3.5">{icon}<Text className="ml-1.5 text-[12px] font-extrabold text-slate-400">{label}</Text></Pressable>;
}

export default function SaleDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const saleId = params.id ?? "";
  const companyId = selectedCompany?._id ?? "";
  const sale = queryClient.getQueryData<SaleDetail>(saleDetailQueryKeys.detail(companyId, saleId));

  if (!saleId || !companyId || !sale) {
    return <View className="flex-1 bg-white"><ScreenHeader title="Sale Details" /><View className="flex-1 items-center justify-center px-6"><Text className="text-[15px] font-bold text-slate-800">Sale is not available</Text><Text className="mt-2 text-center text-[12px] text-slate-500">This detail view is available immediately after creating a sale.</Text></View></View>;
  }

  const party = sale.party_snapshot;
  const totals = sale.totals;
  const allDespatchRows: [string, string | null | undefined][] = [["Challan number", sale.despatch_details.challan_no], ["Container number", sale.despatch_details.container_no], ["Despatch through", sale.despatch_details.despatch_through], ["Destination", sale.despatch_details.destination], ["Vehicle number", sale.despatch_details.vehicle_no], ["Order number", sale.despatch_details.order_no], ["Payment terms", sale.despatch_details.terms_of_pay], ["Delivery terms", sale.despatch_details.terms_of_delivery]];
  const despatchRows = allDespatchRows.filter(([, value]) => Boolean(value));
  const isCancelled = sale.status === "cancelled";

  return <View className="flex-1 bg-slate-50"><ScreenHeader title="Sale Details" /><ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
    <View className="mb-3 overflow-hidden rounded-[15px] bg-[#3f5c76] p-5"><View className="flex-row items-start justify-between gap-4"><View className="min-w-0 flex-1"><Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-blue-200">Sale</Text><Text className="mt-1 text-[22px] font-extrabold text-white">{sale.voucher_number}</Text><Text className="mt-2 text-[12px] text-blue-100">{formatDate(sale.date)} · {party.name || "No customer"}</Text></View><View className={`rounded-full px-3 py-1.5 ${isCancelled ? "bg-rose-100" : "bg-emerald-100"}`}><Text className={`text-[10px] font-extrabold uppercase ${isCancelled ? "text-rose-700" : "text-emerald-700"}`}>{sale.status}</Text></View></View><View className="mt-5 border-t border-gray-200 pt-4"><Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-blue-200">Final amount</Text><Text className="mt-1 text-[25px] font-extrabold text-white">{formatAmount(totals.final_amount)}</Text></View></View>

    <View className="mb-3 flex-row gap-2"><DisabledAction label="Edit" icon={<Pencil color="#94a3b8" size={16} />} /><DisabledAction label="Print" icon={<Printer color="#94a3b8" size={16} />} /><DisabledAction label="Cancel" icon={<Ban color="#94a3b8" size={16} />} /></View>
    <View className="mb-3 flex-row gap-2"><View className="flex-1 rounded-2xl border border-blue-100 bg-blue-50 p-3"><Text className="text-[10px] font-bold uppercase text-blue-500">Items</Text><Text className="mt-1 text-[16px] font-extrabold text-blue-950">{sale.items.length}</Text></View><View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3"><Text className="text-[10px] font-bold uppercase text-slate-400">Tax type</Text><Text className="mt-1 text-[13px] font-extrabold uppercase text-slate-900">{sale.tax_type === "cgst_sgst" ? "CGST + SGST" : "IGST"}</Text></View></View>

    <DetailCard title="Customer" icon={<UserRound color="#2563eb" size={17} />}><Text className="text-[14px] font-extrabold text-slate-900">{party.name || "--"}</Text>{sale.mailing_name ? <Text className="mt-2 text-[12px] text-slate-600">Mailing name: {sale.mailing_name}</Text> : null}{party.mobile ? <Text className="mt-1 text-[12px] text-slate-600">{party.mobile}</Text> : null}{party.gst_no ? <Text className="mt-1 text-[12px] text-slate-600">GSTIN: {party.gst_no}</Text> : null}{party.billing_address ? <Text className="mt-1 text-[12px] leading-5 text-slate-600">{party.billing_address}</Text> : null}{sale.series_name ? <Text className="mt-2 text-[11px] text-slate-500">Series: {sale.series_name}</Text> : null}{sale.tally_status ? <Text className="mt-1 text-[11px] capitalize text-slate-500">Tally: {sale.tally_status}</Text> : null}</DetailCard>

    <DetailCard title={`Products (${sale.items.length})`} icon={<Box color="#2563eb" size={17} />}>{sale.items.map((item, index) => <View key={item._id} className={`rounded-2xl border border-slate-200 bg-slate-50 p-3.5 ${index > 0 ? "mt-2.5" : ""}`}><View className="flex-row items-start justify-between gap-3"><View className="min-w-0 flex-1"><Text className="text-[13px] font-extrabold text-slate-900">{item.item_name}</Text><Text className="mt-1 text-[11px] text-slate-500">Billed {formatQuantity(item.billed_qty)} {item.selected_unit || item.unit || ""} · Actual {formatQuantity(item.actual_qty)}</Text><Text className="mt-1 text-[11px] text-slate-500">Rate {formatAmount(item.rate)} · {sale.tax_type === "igst" ? "IGST" : "GST"} ({formatPercent(item.tax_rate)}%)</Text><Text className="mt-1 text-[11px] text-slate-500">Godown: {item.godown_name}</Text>{item.batch ? <Text className="mt-1 text-[11px] text-slate-500">Batch: {item.batch}</Text> : null}{item.mrp != null ? <Text className="mt-1 text-[11px] text-slate-500">MRP: {formatAmount(item.mrp)}</Text> : null}{item.mfgdt || item.expdt ? <Text className="mt-1 text-[11px] text-slate-500">{item.mfgdt ? `Mfg: ${formatDate(item.mfgdt)}` : ""}{item.mfgdt && item.expdt ? " · " : ""}{item.expdt ? `Exp: ${formatDate(item.expdt)}` : ""}</Text> : null}{item.cess_rate || item.addl_cess_rate ? <Text className="mt-1 text-[11px] text-slate-500">{item.cess_rate ? `Cess (${formatPercent(item.cess_rate)}%)` : ""}{item.cess_rate && item.addl_cess_rate ? " · " : ""}{item.addl_cess_rate ? `Addl. Cess (${formatPercent(item.addl_cess_rate)}%)` : ""}</Text> : null}{item.hsn || item.description ? <Text className="mt-1 text-[11px] text-slate-500">{[item.hsn ? `HSN ${item.hsn}` : "", item.description].filter(Boolean).join(" · ")}</Text> : null}</View><Text className="text-[13px] font-extrabold text-slate-900">{formatAmount(item.total_amount)}</Text></View></View>)}</DetailCard>

    {sale.additional_charges.length > 0 ? <DetailCard title="Additional charges" icon={<ReceiptText color="#2563eb" size={17} />}>{sale.additional_charges.map((charge, index) => <View key={charge._id} className={`flex-row items-start justify-between gap-3 ${index > 0 ? "mt-3 border-t border-slate-100 pt-3" : ""}`}><View className="flex-1"><Text className="text-[12px] font-extrabold text-slate-900">{charge.option}</Text><Text className="mt-1 text-[11px] capitalize text-slate-500">{charge.action}</Text></View><Text className={`text-[12px] font-extrabold ${charge.action === "subtract" ? "text-rose-700" : "text-slate-900"}`}>{charge.action === "subtract" ? "−" : "+"}{formatAmount(charge.final_value)}</Text></View>)}</DetailCard> : null}

    <DetailCard title="Calculation summary" icon={<Calculator color="#2563eb" size={17} />}><DetailRow label="Subtotal" value={formatAmount(totals.sub_total)} /><DetailRow label="Discount" value={formatAmount(totals.total_discount)} /><DetailRow label="Taxable amount" value={formatAmount(totals.taxable_amount)} />{totals.total_igst_amt ? <DetailRow label="IGST" value={formatAmount(totals.total_igst_amt)} /> : null}{totals.total_cgst_amt ? <DetailRow label="CGST" value={formatAmount(totals.total_cgst_amt)} /> : null}{totals.total_sgst_amt ? <DetailRow label="SGST" value={formatAmount(totals.total_sgst_amt)} /> : null}{totals.total_cess_amt ? <DetailRow label="Cess" value={formatAmount(totals.total_cess_amt)} /> : null}<DetailRow label="Tax amount" value={formatAmount(totals.total_tax_amount)} /><DetailRow label="Item total" value={formatAmount(totals.item_total)} /><DetailRow label="Additional charges" value={formatAmount(totals.total_additional_charge)} /><View className="mt-2 border-t border-slate-200 pt-2"><DetailRow strong label="Final amount" value={formatAmount(totals.final_amount)} /></View></DetailCard>
    {despatchRows.length > 0 ? <DetailCard title="Despatch details" icon={<Truck color="#2563eb" size={17} />}>{despatchRows.map(([label, value]) => <DetailRow key={label} label={label} value={value ?? "--"} />)}</DetailCard> : null}
    {sale.narration?.trim() ? <DetailCard title="Narration" icon={<ReceiptText color="#2563eb" size={17} />}><Text className="text-[12px] leading-5 text-slate-600">{sale.narration.trim()}</Text></DetailCard> : null}
  </ScrollView></View>;
}
