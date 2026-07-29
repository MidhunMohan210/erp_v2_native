import { Pressable, Text, View } from "react-native";
import { ChevronRight, UserRound } from "lucide-react-native";

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
    <View className="rounded-[22px] border border-slate-200 bg-white p-5">
      <View className="mb-4">
        <Text className="text-[16px] font-extrabold text-slate-900">
          Customer <Text className="text-rose-500">*</Text>
        </Text>
        <Text className="mt-1 text-[12px] text-slate-500">
          {locked
            ? "Customer cannot be changed while editing."
            : "Select the customer for this order."}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={locked ? "Saved customer" : "Select customer"}
        accessibilityState={{ disabled: disabled || locked }}
        disabled={disabled || locked}
        onPress={onPress}
        className={`flex-row items-center rounded-2xl border px-4 py-4 ${
          disabled
            ? "border-slate-200 bg-slate-100 opacity-60"
            : locked
              ? "border-slate-200 bg-slate-50"
            : "border-sky-200 bg-sky-50"
        }`}
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
          <UserRound color="#0369a1" size={20} strokeWidth={2.2} />
        </View>
        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[14px] font-extrabold text-slate-900"
          >
            {selectedParty?.partyName || "Add customer"}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[12px] text-slate-500">
            {contact || ""}
          </Text>
        </View> 
        <View className="ml-3 items-end">
          {selectedParty?.totalOutstanding != null ? (
            <Text className="mb-1 text-[11px] font-bold text-sky-700">
              {formatOutstanding(selectedParty)}
            </Text>
          ) : null}
          {!locked ? (
            <ChevronRight color="#0284c7" size={19} strokeWidth={2.2} />
          ) : null}
        </View>
      </Pressable>


    </View>
  );
}
