import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { CalendarDays, UserRound } from "lucide-react-native";

type VoucherDetailHeroProps = {
  voucherType: string;
  voucherNumber: string;
  status: string;
  statusTone: "active" | "warning" | "cancelled";
  amount: string;
  date: string;
  customer: string;
};

type VoucherDetailCardProps = {
  title: string;
  icon: ReactNode;
  iconBackgroundClass: string;
  children: ReactNode;
};

type VoucherDetailRowProps = {
  label: string;
  value: string;
  strong?: boolean;
};

type VoucherDetailMetricProps = {
  label: string;
  value: string;
};

type VoucherProductCardProps = {
  name: string;
  amount: string;
  quantity: string;
  children: ReactNode;
};

export function VoucherDetailHero({
  voucherType,
  voucherNumber,
  status,
  statusTone,
  amount,
  date,
  customer,
}: VoucherDetailHeroProps) {
  const statusBackground = statusTone === "cancelled"
    ? "bg-rose-100"
    : statusTone === "warning"
      ? "bg-amber-100"
      : "bg-emerald-100";
  const statusText = statusTone === "cancelled"
    ? "text-rose-800"
    : statusTone === "warning"
      ? "text-amber-800"
      : "text-emerald-800";

  return (
    <View className="mb-4 overflow-hidden rounded-[24px] bg-[#3f5c76] p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-blue-200">
            {voucherType}
          </Text>
          <Text className="mt-1 text-[23px] font-extrabold text-white">
            {voucherNumber}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1.5 ${statusBackground}`}>
          <Text className={`text-[10px] font-extrabold capitalize ${statusText}`}>
            {status}
          </Text>
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-[11px] font-semibold text-blue-200">Final amount</Text>
        <Text className="mt-1 text-[30px] font-extrabold tracking-tight text-white">
          {amount}
        </Text>
      </View>

      <View className="mt-5 border-t border-blue-300/30 pt-4">
        <View className="flex-row items-center">
          <CalendarDays color="#bfdbfe" size={15} />
          <Text className="ml-2 text-[12px] font-semibold text-white">{date}</Text>
        </View>
        <View className="mt-2.5 flex-row items-start">
          <UserRound color="#bfdbfe" size={15} />
          <Text className="ml-2 flex-1 text-[12px] font-semibold text-white">
            {customer}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function VoucherDetailCard({
  title,
  icon,
  iconBackgroundClass,
  children,
}: VoucherDetailCardProps) {
  return (
    <View className="mb-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
      <View className="mb-4 flex-row items-center">
        <View
          className={`h-10 w-10 items-center justify-center rounded-[14px] ${iconBackgroundClass}`}
        >
          {icon}
        </View>
        <Text className="ml-3 text-[15px] font-extrabold text-slate-900">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function VoucherDetailRow({
  label,
  value,
  strong = false,
}: VoucherDetailRowProps) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-2">
      <Text
        className={`flex-1 text-[12px] ${strong ? "font-bold text-slate-900" : "text-slate-500"}`}
      >
        {label}
      </Text>
      <Text
        className={`max-w-[58%] text-right text-[12px] ${strong ? "font-extrabold text-[#134074]" : "font-semibold text-slate-800"}`}
      >
        {value}
      </Text>
    </View>
  );
}

export function VoucherDetailMetric({ label, value }: VoucherDetailMetricProps) {
  return (
    <View className="flex-1 rounded-[20px] border border-slate-100 bg-white px-4 py-3.5">
      <Text className="text-[10px] font-bold uppercase tracking-[0.7px] text-slate-400">
        {label}
      </Text>
      <Text className="mt-1 text-[15px] font-extrabold text-[#134074]">
        {value}
      </Text>
    </View>
  );
}

export function VoucherProductCard({
  name,
  amount,
  quantity,
  children,
}: VoucherProductCardProps) {
  return (
    <View className="rounded-[18px] border border-slate-100 bg-slate-50 p-3.5">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="min-w-0 flex-1 text-[13px] font-extrabold text-slate-900">
          {name}
        </Text>
        <Text className="text-[13px] font-extrabold text-[#134074]">
          {amount}
        </Text>
      </View>
      <Text className="mt-1.5 text-[11px] font-bold text-slate-600">
        {quantity}
      </Text>
      <View className="mt-2 border-t border-slate-200 pt-2">{children}</View>
    </View>
  );
}
