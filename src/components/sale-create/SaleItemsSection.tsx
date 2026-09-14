import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import {
  ChevronRight,
  PackageOpen,
  PackagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
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
    <View className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <View className="flex-row items-start">
        <View className="flex-1 pr-3">
          <Text numberOfLines={1} className="text-[14px] font-extrabold text-slate-900">
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
            ₹{item.totalAmount.toFixed(2)}
          </Text>
          <View className="mt-2 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
              onPress={() => onEdit(item)}
              className="h-10 w-10 items-center justify-center rounded-xl bg-white"
            >
              <Pencil color="#134074" size={16} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name}`}
              onPress={() => onRemove(item.id)}
              className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50"
            >
              <Trash2 color="#e11d48" size={16} />
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
      <View className="rounded-[24px] border border-slate-200 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF2F8]">
              <PackagePlus color="#134074" size={21} strokeWidth={2.2} />
            </View>
            <View className="ml-3">
              <Text className="text-[16px] font-extrabold text-slate-900">
                Products
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-500">
                {items.length
                  ? `${items.length} stock allocation${items.length === 1 ? "" : "s"}`
                  : "Build the sale cart"}
              </Text>
            </View>
          </View>
          {items.length > 0 ? (
            <View className="rounded-full bg-[#EAF2F8] px-2.5 py-1.5">
              <Text className="text-[11px] font-extrabold text-[#134074]">
                {items.length}
              </Text>
            </View>
          ) : null}
        </View>

        {items.length === 0 ? (
          <View className="mt-4 items-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-5 py-5">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
              <PackageOpen
                color={disabled ? "#94a3b8" : "#134074"}
                size={23}
                strokeWidth={2}
              />
            </View>
            <Text className="mt-3 text-[14px] font-extrabold text-slate-800">
              No products yet
            </Text>
            <Text className="mt-1 text-center text-[11px] leading-4 text-slate-500">
              {disabled
                ? "Select a customer first to load pricing and tax details."
                : "Search stock, choose a godown and add products to this sale."}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add product"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={onAddPress}
              className={`mt-4 min-h-12 w-full flex-row items-center justify-center rounded-2xl px-4 ${
                disabled ? "bg-slate-200" : "bg-[#134074]"
              }`}
            >
              <Plus color={disabled ? "#64748b" : "#ffffff"} size={18} strokeWidth={2.5} />
              <Text
                className={`ml-2 text-[13px] font-extrabold ${
                  disabled ? "text-slate-500" : "text-white"
                }`}
              >
                {disabled ? "Select customer first" : "Add products"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add more products"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onAddPress}
            className={`mt-4 min-h-12 flex-row items-center justify-center rounded-2xl border px-4 ${
              disabled
                ? "border-slate-200 bg-slate-100"
                : "border-[#A9C4D8] bg-[#EAF2F8]"
            }`}
          >
            <Plus color={disabled ? "#94a3b8" : "#134074"} size={18} strokeWidth={2.5} />
            <Text
              className={`ml-2 text-[13px] font-extrabold ${
                disabled ? "text-slate-400" : "text-[#134074]"
              }`}
            >
              Add more products
            </Text>
          </Pressable>
        )}

        {items.length > 0 ? (
          <View className="mt-4">
            {previewItems.map((item) => (
              <SaleItemCard key={item.id} item={item} onEdit={onEdit} onRemove={handleRemove} />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Show all ${items.length} products`}
              onPress={() => setIsAllItemsOpen(true)}
              className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
            >
              <Text className="flex-1 text-[12px] font-bold text-slate-700">Review cart</Text>
              <Text className="mr-2 text-[11px] text-slate-500">
                {items.length} product{items.length === 1 ? "" : "s"}
              </Text>
              <ChevronRight color="#94a3b8" size={17} strokeWidth={2.2} />
            </Pressable>
            <View className="mt-4 flex-row justify-between rounded-xl bg-[#EAF2F8] px-4 py-3">
              <Text className="text-[12px] font-bold text-[#134074]">Item total</Text>
              <Text className="text-[14px] font-extrabold text-[#134074]">
                ₹{totals.itemTotal.toFixed(2)}
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
