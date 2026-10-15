import { Pressable, Text, View } from "react-native";
import { ChevronRight, LockKeyhole, UsersRound } from "lucide-react-native";

import type { Party } from "@/types/party";

type VoucherPartySelectorProps = {
  selectedParty: Party | null;
  onPress: () => void;
  disabled?: boolean;
  locked?: boolean;
  lockedMessage?: string;
  // Receipts settle debit bills only, so they show gross receivable rather than net balance.
  outstandingMode?: "net" | "receivable";
};

function formatOutstanding(party: Party, outstandingMode: "net" | "receivable"): string {
  const amount = outstandingMode === "receivable"
    ? Number(party.totalReceivable) || 0
    : Number(party.totalOutstanding) || 0;
  const classification = party.classification?.toUpperCase() || "DR";

  return outstandingMode === "receivable"
    ? `${amount.toFixed(2)} DR`
    : `${amount.toFixed(2)} ${classification}`;
}

export function VoucherPartySelector({
  selectedParty,
  onPress,
  disabled = false,
  locked = false,
  lockedMessage = "Customer cannot be changed",
  outstandingMode = "net",
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
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100">
          <UsersRound color="#a16207" size={22} strokeWidth={2.2} />
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
        <View className="mt-4 flex-row items-start rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-amber-100">
            <LockKeyhole color="#a16207" size={12} strokeWidth={2.5} />
          </View>
          <Text className="ml-2 flex-1 text-[12px] font-medium leading-5 text-amber-950">
            {lockedMessage}
          </Text>
        </View>
      ) : null}
      {selectedParty && (outstandingMode === "receivable" || selectedParty.totalOutstanding != null) ? (
        <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Text className="text-[11px] text-slate-500">{outstandingMode === "receivable" ? "Outstanding debit balance" : "Outstanding balance"}</Text>
          <Text className="text-[12px] font-bold text-[#134074]">{formatOutstanding(selectedParty, outstandingMode)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
