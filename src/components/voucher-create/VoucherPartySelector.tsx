import { Pressable, Text, View } from "react-native";
import { ChevronRight, UserRound } from "lucide-react-native";

import type { Party } from "@/types/party";

type VoucherPartySelectorProps = {
  selectedParty: Party | null;
  onPress: () => void;
  disabled?: boolean;
  locked?: boolean;
  compact?: boolean;
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
  compact = false,
}: VoucherPartySelectorProps) {
  const contact =
    selectedParty?.mobileNumber ||
    selectedParty?.emailID ||
    "Search and select customer";

  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={locked ? "Saved customer" : "Select customer"}
        accessibilityState={{ disabled: disabled || locked }}
        disabled={disabled || locked}
        onPress={onPress}
        className={`flex-row items-center rounded-[24px] border border-slate-200 bg-white px-4 py-4 ${
          disabled ? "opacity-60" : ""
        }`}
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2F8]">
          <UserRound color="#134074" size={22} strokeWidth={2.2} />
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <View className="flex-row items-center">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-slate-400">
              Customer
            </Text>
            <Text className="ml-1 text-rose-500">*</Text>
          </View>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-[15px] font-extrabold text-slate-900"
          >
            {selectedParty?.partyName || "Select customer"}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-[11px] text-slate-500">
            {selectedParty ? contact : "Required before adding products"}
          </Text>
        </View>
        <View className="ml-3 items-end">
          {selectedParty?.totalOutstanding != null ? (
            <Text className="mb-1 rounded-full bg-[#EAF2F8] px-2 py-1 text-[10px] font-bold text-[#134074]">
              {formatOutstanding(selectedParty)}
            </Text>
          ) : null}
          {!locked ? (
            <ChevronRight color="#134074" size={19} strokeWidth={2.2} />
          ) : null}
        </View>
      </Pressable>
    );
  }

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
