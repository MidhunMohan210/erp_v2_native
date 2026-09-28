import { Text, TextInput, View } from "react-native";
import { FileCheck2 } from "lucide-react-native";

import { TransactionDateSelector } from "@/components/voucher-create/TransactionDateSelector";

type ReceiptChequeSectionProps = {
  chequeNumber: string;
  chequeDate: string | null;
  onChequeNumberChange: (value: string) => void;
  onChequeDateChange: (value: string) => void;
  disabled?: boolean;
};

export function ReceiptChequeSection({
  chequeNumber,
  chequeDate,
  onChequeNumberChange,
  onChequeDateChange,
  disabled = false,
}: ReceiptChequeSectionProps) {
  return (
    <View className="rounded-3xl bg-white p-5 shadow-sm">
      <View className="mb-4 flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-violet-50">
          <FileCheck2 color="#7c3aed" size={20} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[14px] font-bold text-slate-900">
            Cheque details
          </Text>
          <Text className="mt-0.5 text-[11px] text-slate-500">
            Both fields are required for a Cheque Receipt.
          </Text>
        </View>
      </View>

      <Text className="mb-2 text-[12px] font-bold text-slate-700">
        Cheque number <Text className="text-rose-500">*</Text>
      </Text>
      <TextInput
        accessibilityLabel="Cheque number"
        value={chequeNumber}
        onChangeText={onChequeNumberChange}
        editable={!disabled}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={50}
        placeholder="Enter cheque number"
        placeholderTextColor="#94a3b8"
        className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[14px] text-slate-900 ${
          disabled ? "bg-slate-100 text-slate-400" : ""
        }`}
      />

      <View className="mt-4">
        <TransactionDateSelector
          label="Cheque date"
          value={chequeDate ?? ""}
          onChange={onChequeDateChange}
          disabled={disabled}
        />
      </View>
    </View>
  );
}
