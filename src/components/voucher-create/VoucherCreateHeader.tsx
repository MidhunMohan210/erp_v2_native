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
    <View className="rounded-3xl bg-white px-5 py-4 shadow-sm">
      <View className="mb-2 flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF2F8]">
          <FileText color="#134074" size={19} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-bold text-slate-900">{title}</Text>
          <Text className="mt-0.5 text-[11px] text-slate-500" numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>

      <TransactionDateSelector
        value={transactionDate}
        onChange={onTransactionDateChange}
        disabled={isDateDisabled}
        variant="voucher"
      />

      <View className="border-t border-slate-100">{children}</View>
    </View>
  );
}
