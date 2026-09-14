import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { ChevronRight, PackagePlus, Pencil, Trash2, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SaleItem } from "@/types/sale";
import type { SaleOrderItemTotals } from "@/types/saleOrder";

const PREVIEW_ITEM_COUNT = 3;

type SaleItemsSectionProps = {
  items: SaleItem[];
  totals: SaleOrderItemTotals;
  disabled: boolean;
  isItemEditorOpen: boolean;
  onAddPress: () => void;
  onEdit: (item: SaleItem) => void;
  onRemove: (itemId: string) => void;
};

type SaleItemCardProps = {
  item: SaleItem;
  onEdit: (item: SaleItem) => void;
  onRemove: (itemId: string) => void;
};

type SaleAllItemsModalProps = {
  visible: boolean;
  items: SaleItem[];
  totals: SaleOrderItemTotals;
  onClose: () => void;
  onEdit: (item: SaleItem) => void;
  onRemove: (itemId: string) => void;
};

function SaleItemCard({ item, onEdit, onRemove }: SaleItemCardProps) {
  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
      <View className="flex-row items-start">
        <View className="flex-1 pr-3">
          <Text numberOfLines={1} className="text-[14px] font-bold text-slate-900">
            {item.name}
          </Text>
          <Text className="mt-1 text-[11px] text-slate-500">
            {item.godownName || "Godown name unavailable"}
            {item.batch ? ` · Batch ${item.batch}` : ""}
          </Text>
          <Text className="mt-1 text-[11px] text-slate-500">
            Billed {item.billedQty} {item.baseUnit} · Actual {item.actualQty}
            {item.baseUnit} · Rate {item.rate.toFixed(2)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[14px] font-extrabold text-slate-900">
            {item.totalAmount.toFixed(2)}
          </Text>
          <View className="mt-2 flex-row gap-2">
            <Pressable accessibilityLabel={`Edit ${item.name}`} onPress={() => onEdit(item)} className="rounded-lg bg-white p-2">
              <Pencil color="#134074" size={15} />
            </Pressable>
            <Pressable accessibilityLabel={`Remove ${item.name}`} onPress={() => onRemove(item.id)} className="rounded-lg bg-rose-50 p-2">
              <Trash2 color="#e11d48" size={15} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// This is shared by the Sale screen and the add-products sheet so both entry
// points show the same committed-cart UI.
export function SaleAllItemsModal({
  visible,
  items,
  totals,
  onClose,
  onEdit,
  onRemove,
}: SaleAllItemsModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="h-[85%] rounded-t-[28px] bg-white px-5 pt-5" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[18px] font-extrabold text-slate-900">All products</Text>
              <Text className="mt-1 text-[12px] text-slate-500">
                Review all stock allocations and edit individual rows.
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close all products" onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <X color="#475569" size={19} strokeWidth={2.2} />
            </Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SaleItemCard item={item} onEdit={onEdit} onRemove={onRemove} />
            )}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <View className="rounded-xl bg-[#EAF2F8] px-4 py-3">
                <View className="flex-row justify-between">
                  <Text className="text-[12px] font-bold text-[#134074]">
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </Text>
                  <Text className="text-[14px] font-extrabold text-[#134074]">
                    {totals.itemTotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

export function SaleItemsSection({
  items,
  totals,
  disabled,
  isItemEditorOpen,
  onAddPress,
  onEdit,
  onRemove,
}: SaleItemsSectionProps) {
  const [isAllItemsOpen, setIsAllItemsOpen] = useState(false);
  const [reopenAllItemsAfterEdit, setReopenAllItemsAfterEdit] = useState(false);
  const previewItems = items.slice(0, PREVIEW_ITEM_COUNT);

  const handleEditFromAllItems = (item: SaleItem) => {
    // Native modals appear one at a time. Reopen this list after Save.
    setReopenAllItemsAfterEdit(true);
    setIsAllItemsOpen(false);
    onEdit(item);
  };

  useEffect(() => {
    if (!reopenAllItemsAfterEdit || isItemEditorOpen) return;

    setReopenAllItemsAfterEdit(false);
    if (items.length > 0) setIsAllItemsOpen(true);
  }, [isItemEditorOpen, items.length, reopenAllItemsAfterEdit]);

  const handleRemove = (itemId: string) => {
    if (items.length === 1) setIsAllItemsOpen(false);
    onRemove(itemId);
  };

  return (
    <>
      <View className="rounded-[22px] border border-slate-200 bg-white p-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[16px] font-extrabold text-slate-900">Items</Text>
            <Text className="mt-1 text-[12px] text-slate-500">
              {items.length
                ? `${items.length} stock allocation${items.length === 1 ? "" : "s"}`
                : "No products added"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add product"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onAddPress}
            className={`h-10 w-10 items-center justify-center rounded-xl ${disabled ? "bg-slate-100" : "bg-[#134074]"}`}
          >
            <PackagePlus color={disabled ? "#94a3b8" : "#ffffff"} size={20} />
          </Pressable>
        </View>

        {items.length > 0 ? (
          <View className="mt-4">
            {previewItems.map((item) => (
              <SaleItemCard key={item.id} item={item} onEdit={onEdit} onRemove={handleRemove} />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Show all ${items.length} products`}
              onPress={() => setIsAllItemsOpen(true)}
              className="flex-row items-center rounded-2xl border border-[#A9C4D8] bg-[#EAF2F8] px-4 py-3.5"
            >
              <Text className="flex-1 text-[12px] font-bold text-[#134074]">Show all products</Text>
              <Text className="mr-2 text-[11px] text-slate-500">
                {items.length} product{items.length === 1 ? "" : "s"}
              </Text>
              <ChevronRight color="#134074" size={17} strokeWidth={2.2} />
            </Pressable>
            <View className="mt-4 flex-row justify-between rounded-xl bg-[#EAF2F8] px-4 py-3">
              <Text className="text-[12px] font-bold text-[#134074]">Item total</Text>
              <Text className="text-[14px] font-extrabold text-[#134074]">
                {totals.itemTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <SaleAllItemsModal
        visible={isAllItemsOpen}
        items={items}
        totals={totals}
        onClose={() => setIsAllItemsOpen(false)}
        onEdit={handleEditFromAllItems}
        onRemove={handleRemove}
      />
    </>
  );
}
