import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { FileText } from "lucide-react-native";

import { TransactionDateSelector } from "@/components/voucher-create/TransactionDateSelector";

type VoucherCreateHeaderProps = {
  title: string;
  description: string;
  transactionDate: string;
  onTransactionDateChange: (date: string) => void;
  isDateDisabled?: boolean;
  mobileLayout?: boolean;
  children: ReactNode;
};

export function VoucherCreateHeader({
  title,
  description,
  transactionDate,
  onTransactionDateChange,
  isDateDisabled = false,
  mobileLayout = false,
  children,
}: VoucherCreateHeaderProps) {
  if (mobileLayout) {
    return (
      <View className="overflow-hidden rounded-[28px] bg-[#134074] shadow-sm">
        <View className="flex-row items-center px-5 pb-4 pt-5">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <FileText color="#ffffff" size={22} strokeWidth={2.2} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[17px] font-extrabold text-white">
              {title}
            </Text>
            <Text className="mt-0.5 text-[12px] text-white/70">
              {description}
            </Text>
          </View>
        </View>

        <View className="rounded-t-[24px] bg-white p-4">
          <TransactionDateSelector
            value={transactionDate}
            onChange={onTransactionDateChange}
            disabled={isDateDisabled}
          />

          <View className="mt-4 border-t border-slate-100 pt-4">
            {children}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="rounded-[22px] border border-slate-200 bg-white p-5">
      <View className="mb-5 flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
          <FileText color="#134074" size={22} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[17px] font-extrabold text-slate-900">
            {title}
          </Text>
          <Text className="mt-0.5 text-[12px] text-slate-500">
            {description}
          </Text>
        </View>
      </View>

      <TransactionDateSelector
        value={transactionDate}
        onChange={onTransactionDateChange}
        disabled={isDateDisabled}
      />

      <View className="mt-5">{children}</View>
    </View>
  );
}
