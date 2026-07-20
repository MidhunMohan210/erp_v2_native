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
  children: ReactNode;
};

export function VoucherCreateHeader({
  title,
  description,
  transactionDate,
  onTransactionDateChange,
  isDateDisabled = false,
  children,
}: VoucherCreateHeaderProps) {
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
