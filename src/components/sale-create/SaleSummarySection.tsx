import { Pressable, Text, View } from "react-native";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-[13px] text-slate-600">{label}</Text>
      <Text className="text-[13px] font-bold text-slate-900">{value}</Text>
    </View>
  );
}

export function SaleSummarySection() {
  return (
    <View className="rounded-[22px] border border-slate-200 bg-white p-5">
      <Text className="text-[16px] font-extrabold text-slate-900">Summary</Text>
      <View className="mt-3 border-y border-slate-100 py-1">
        <SummaryRow label="Subtotal" value="0.00" />
        <SummaryRow label="Total" value="0.00" />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create sale"
        accessibilityState={{ disabled: true }}
        disabled
        className="mt-4 rounded-2xl bg-slate-200 px-4 py-3.5"
      >
        <Text className="text-center text-[14px] font-bold text-slate-500">
          Create Sale
        </Text>
      </Pressable>
    </View>
  );
}
