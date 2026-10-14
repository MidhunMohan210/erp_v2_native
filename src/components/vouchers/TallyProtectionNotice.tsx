import { ShieldCheck } from "lucide-react-native";
import { Text, View } from "react-native";

import { TALLY_ACCEPTED_MESSAGE } from "@/utils/tallyProtection";

export function TallyProtectionNotice() {
  return (
    <View className="-mt-1 mb-4 flex-row rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-amber-100">
        <ShieldCheck color="#b45309" size={19} strokeWidth={2.3} />
      </View>
      <View className="flex-1">
        <Text className="text-[12px] font-extrabold text-amber-900">
          Accepted by Tally
        </Text>
        <Text className="mt-0.5 text-[11px] leading-4 text-amber-800">
          {TALLY_ACCEPTED_MESSAGE}
        </Text>
      </View>
    </View>
  );
}
