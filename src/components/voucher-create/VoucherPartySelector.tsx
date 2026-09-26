import { Pressable, Text, View } from "react-native";
import { ChevronRight, UsersRound } from "lucide-react-native";

import type { Party } from "@/types/party";

type VoucherPartySelectorProps = {
  selectedParty: Party | null;
  onPress: () => void;
  disabled?: boolean;
  locked?: boolean;
};

function formatOutstanding(party: Party): string {
  const amount = Number(party.totalOutstanding) || 0;
  const classification = party.classification?.toUpperCase() || "DR";

  return `${amount.toFixed(2)} ${classification}`;
}

export function VoucherPartySelector({
  selectedParty,
  onPress,
  disabled = false,
  locked = false,
}: VoucherPartySelectorProps) {
  const contact =
    selectedParty?.mobileNumber ||
    selectedParty?.emailID ||
    "Search and select customer";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? "Saved customer" : "Select customer"}
      accessibilityState={{ disabled: disabled || locked }}
      disabled={disabled || locked}
      onPress={onPress}
      className={`rounded-3xl bg-white p-5 shadow-sm ${disabled ? "opacity-50" : ""}`}
    >
      <View className="min-h-16 flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2F8]">
          <UsersRound color="#134074" size={22} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Customer <Text className="text-rose-500">*</Text>
          </Text>
          <Text numberOfLines={1} className={`mt-1 text-[15px] font-bold ${selectedParty ? "text-slate-900" : "text-[#134074]"}`}>
            {selectedParty?.partyName || "Select customer"}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-[12px] text-slate-500">
            {contact}
          </Text>
        </View>
        {!locked ? <ChevronRight color="#94a3b8" size={20} strokeWidth={2.2} /> : null}
      </View>
      {locked ? (
        <Text className="ml-[60px] text-[11px] text-slate-500">Customer cannot be changed</Text>
      ) : null}
      {selectedParty?.totalOutstanding != null ? (
        <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Text className="text-[11px] text-slate-500">Outstanding balance</Text>
          <Text className="text-[12px] font-bold text-[#134074]">{formatOutstanding(selectedParty)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
