import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, Search, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PriceLevel } from "@/types/product";

const DEFAULT_PRICE_LEVEL_ID = "default-pricing";

type PriceLevelChoice = {
  id: string;
  label: string;
  priceLevel: PriceLevel | null;
};

type PriceLevelSelectionModalProps = {
  visible: boolean;
  priceLevels: PriceLevel[];
  selectedPriceLevel: PriceLevel | null;
  onClose: () => void;
  onSelect: (priceLevel: PriceLevel | null) => void;
};

function getPriceLevelName(priceLevel: PriceLevel): string {
  return priceLevel.pricelevel || priceLevel.name || "Unnamed price level";
}

export function PriceLevelSelectionModal({
  visible,
  priceLevels,
  selectedPriceLevel,
  onClose,
  onSelect,
}: PriceLevelSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [draftId, setDraftId] = useState(DEFAULT_PRICE_LEVEL_ID);

  useEffect(() => {
    if (!visible) return;
    setSearchText("");
    setDraftId(selectedPriceLevel?._id ?? DEFAULT_PRICE_LEVEL_ID);
  }, [selectedPriceLevel, visible]);

  const choices = useMemo<PriceLevelChoice[]>(
    () => [
      {
        id: DEFAULT_PRICE_LEVEL_ID,
        label: "Default pricing",
        priceLevel: null,
      },
      ...priceLevels.map((priceLevel) => ({
        id: priceLevel._id,
        label: getPriceLevelName(priceLevel),
        priceLevel,
      })),
    ],
    [priceLevels],
  );

  const filteredChoices = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return choices;
    return choices.filter((choice) => choice.label.toLowerCase().includes(search));
  }, [choices, searchText]);

  const confirmSelection = () => {
    const choice = choices.find((item) => item.id === draftId);
    if (!choice) return;
    onClose();
    onSelect(choice.priceLevel);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View
          className="h-[75%] rounded-t-[28px] bg-white px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[18px] font-extrabold text-slate-900">
                Select price level
              </Text>
              <Text className="mt-1 text-[12px] text-slate-500">
                Choose how product rates should be filled.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close price level selector"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X color="#475569" size={19} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View className="mt-4 flex-row items-center rounded-2xl border border-slate-300 bg-slate-50 px-4">
            <Search color="#64748b" size={18} strokeWidth={2.2} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search price levels"
              placeholderTextColor="#94a3b8"
              className="ml-3 flex-1 py-3.5 text-[14px] text-slate-900"
            />
          </View>

          <FlatList
            className="mt-3 flex-1"
            data={filteredChoices}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = item.id === draftId;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => setDraftId(item.id)}
                  className={`mb-2 flex-row items-center rounded-2xl border px-4 py-3.5 ${
                    isSelected
                      ? "border-blue-700 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-blue-700 bg-blue-600"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected ? (
                      <Check color="#ffffff" size={13} strokeWidth={3} />
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={2}
                    className="ml-3 flex-1 text-[13px] font-bold text-slate-800"
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-[13px] font-semibold text-slate-700">
                  No matching price levels
                </Text>
              </View>
            }
          />

          <View className="flex-row gap-3 border-t border-slate-100 pt-3">
            <Pressable
              onPress={onClose}
              className="flex-1 items-center rounded-xl border border-slate-300 py-3.5"
            >
              <Text className="text-[13px] font-bold text-slate-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirmSelection}
              className="flex-1 items-center rounded-xl bg-blue-600 py-3.5"
            >
              <Text className="text-[13px] font-bold text-white">Select</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
