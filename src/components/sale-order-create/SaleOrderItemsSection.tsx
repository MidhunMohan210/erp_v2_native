import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import {
  ChevronRight,
  Minus,
  Package2,
  PackagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RemoveItemConfirmationSheet } from "@/components/sale-order-create/RemoveItemConfirmationSheet";
import type { SaleOrderItem, SaleOrderItemTotals } from "@/types/saleOrder";

type SaleOrderItemsSectionProps = {
  items: SaleOrderItem[];
  totals: SaleOrderItemTotals;
  disabled?: boolean;
  isItemEditorOpen: boolean;
  onAddPress: () => void;
  onEdit: (item: SaleOrderItem) => void;
  onIncrement: (item: SaleOrderItem) => void;
  onDecrement: (item: SaleOrderItem) => void;
  onRemove: (itemId: string) => void;
};

function formatMoney(value: number): string {
  return value.toFixed(2);
}

const PREVIEW_ITEM_COUNT = 3;

type SaleOrderItemCardProps = {
  item: SaleOrderItem;
  disabled: boolean;
  onEdit: (item: SaleOrderItem) => void;
  onIncrement: (item: SaleOrderItem) => void;
  onDecrement: (item: SaleOrderItem) => void;
  onRemove: (item: SaleOrderItem) => void;
};

function SaleOrderItemCard({
  item,
  disabled,
  onEdit,
  onIncrement,
  onDecrement,
  onRemove,
}: SaleOrderItemCardProps) {
  return (
    <View className="mb-2 rounded-2xl bg-slate-50 p-4">
      <View className="flex-row items-start">
        <View className="flex-1 pr-3">
          <Text
            numberOfLines={1}
            className="text-[14px] font-extrabold text-slate-900"
          >
            {item.name}
          </Text>
          <Text className="mt-1 text-[11px] text-slate-500">
            Rate {formatMoney(item.rate)} · Tax {formatMoney(item.taxRate)}%
          </Text>
          <Text className="mt-1 text-[11px] text-slate-500">
            Pricing: {item.initialPriceSource}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[14px] font-extrabold text-slate-900">
            {formatMoney(item.totalAmount)}
          </Text>
          <View className="mt-2 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
              disabled={disabled}
              hitSlop={4}
              onPress={() => onEdit(item)}
              className={`min-h-10 flex-row items-center rounded-xl bg-white px-3 py-2 ${disabled ? "opacity-50" : ""}`}
            >
              <Pencil color="#134074" size={13} strokeWidth={2.2} />
              <Text className="ml-1 text-[11px] font-bold text-[#134074]">
                Edit
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name}`}
              disabled={disabled}
              hitSlop={4}
              onPress={() => onRemove(item)}
              className={`min-h-10 flex-row items-center rounded-xl bg-rose-50 px-3 py-2 ${disabled ? "opacity-50" : ""}`}
            >
              <Trash2 color="#e11d48" size={13} strokeWidth={2.2} />
              <Text className="ml-1 text-[11px] font-bold text-rose-700">
                Remove
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row items-center border-t border-slate-200 pt-3">
        <Text className="mr-3 text-[12px] font-bold text-slate-600">
          Quantity
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${item.name} quantity`}
          disabled={disabled}
          hitSlop={4}
          onPress={() => onDecrement(item)}
          className={`h-10 w-10 items-center justify-center rounded-xl bg-rose-50 ${disabled ? "opacity-50" : ""}`}
        >
          <Minus color="#e11d48" size={15} strokeWidth={2.4} />
        </Pressable>
        <Text className="min-w-12 text-center text-[14px] font-extrabold text-slate-900">
          {item.billedQty}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${item.name} quantity`}
          disabled={disabled}
          hitSlop={4}
          onPress={() => onIncrement(item)}
          className={`h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2F8] ${disabled ? "opacity-50" : ""}`}
        >
          <Plus color="#134074" size={15} strokeWidth={2.4} />
        </Pressable>
        <Text className="ml-auto text-[11px] text-slate-500">
          {item.unit || "unit"}
        </Text>
      </View>
    </View>
  );
}

export function SaleOrderItemsSection({
  items,
  totals,
  disabled = false,
  isItemEditorOpen,
  onAddPress,
  onEdit,
  onIncrement,
  onDecrement,
  onRemove,
}: SaleOrderItemsSectionProps) {
  const insets = useSafeAreaInsets();
  const [isAllItemsOpen, setIsAllItemsOpen] = useState(false);
  const [reopenAllItemsAfterEdit, setReopenAllItemsAfterEdit] =
    useState(false);
  const [itemPendingRemoval, setItemPendingRemoval] =
    useState<SaleOrderItem | null>(null);
  const previewItems = items.slice(0, PREVIEW_ITEM_COUNT);

  const handleEditFromAllItems = (item: SaleOrderItem) => {
    // Native modals are shown one at a time. Remember this origin so the full
    // list can return after the separate item editor finishes.
    setReopenAllItemsAfterEdit(true);
    setIsAllItemsOpen(false);
    onEdit(item);
  };

  useEffect(() => {
    if (!reopenAllItemsAfterEdit || isItemEditorOpen) return;

    setReopenAllItemsAfterEdit(false);
    if (items.length > 0) {
      setIsAllItemsOpen(true);
    }
  }, [isItemEditorOpen, items.length, reopenAllItemsAfterEdit]);

  const confirmItemRemoval = () => {
    if (!itemPendingRemoval) return;

    onRemove(itemPendingRemoval.id);
    setItemPendingRemoval(null);

    if (items.length === 1) {
      setIsAllItemsOpen(false);
    }
  };

  return (
    <>
      <View className="rounded-3xl bg-white p-5 shadow-sm">
        <View className="mb-4 flex-row items-center">
          <View className="flex-1">
            <Text className="text-[17px] font-bold text-slate-900">
              Products <Text className="text-rose-500">*</Text>
            </Text>
            <Text className="mt-0.5 text-[11px] text-slate-500">
              {items.length ? `${items.length} order line${items.length === 1 ? "" : "s"}` : "Build your order line by line"}
            </Text>
          </View>
        </View>

        {items.length === 0 ? (
          <View className="mb-4 items-center rounded-2xl bg-slate-50 px-4 py-5">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF2F8]">
              <Package2 color="#134074" size={21} strokeWidth={2.2} />
            </View>
            <Text className="mt-2 text-[13px] font-semibold text-slate-700">No products added</Text>
            <Text className="mt-1 text-center text-[11px] text-slate-500">Select a customer, then add products to this order.</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add products"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onAddPress}
          className={`min-h-12 flex-row items-center justify-center rounded-2xl px-4 py-3 ${
            disabled ? "bg-slate-200" : "bg-[#134074]"
          }`}
        >
          <PackagePlus color={disabled ? "#94a3b8" : "#ffffff"} size={18} strokeWidth={2.2} />
          <Text className={`ml-2 text-[13px] font-bold ${disabled ? "text-slate-500" : "text-white"}`}>
            Add products
          </Text>
        </Pressable>

        {items.length > 0 ? (
          <View className="mt-4">
            {previewItems.map((item) => (
              <SaleOrderItemCard
                key={item.id}
                item={item}
                disabled={disabled}
                onEdit={onEdit}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={setItemPendingRemoval}
              />
            ))}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Show all ${items.length} products`}
              onPress={() => setIsAllItemsOpen(true)}
              className="mb-3 min-h-11 flex-row items-center rounded-2xl bg-[#EAF2F8] px-4 py-3"
            >
              <Text className="flex-1 text-[12px] font-bold text-[#134074]">
                Show all products
              </Text>
              <Text className="mr-2 text-[11px] text-slate-500">
                {items.length} product{items.length === 1 ? "" : "s"}
              </Text>
              <ChevronRight color="#64748b" size={17} strokeWidth={2.2} />
            </Pressable>

            <View className="border-t border-slate-100 pt-3">
              <View className="flex-row justify-between">
                <Text className="text-[12px] font-bold text-[#134074]">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </Text>
                <Text className="text-[14px] font-extrabold text-[#134074]">
                  {formatMoney(totals.itemTotal)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <Modal
        visible={isAllItemsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAllItemsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="h-[85%] rounded-t-[28px] bg-white px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="mb-4 flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-[18px] font-extrabold text-slate-900">
                  All products
                </Text>
                <Text className="mt-1 text-[12px] text-slate-500">
                  Review the full product list and edit individual rows.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close all products"
                onPress={() => setIsAllItemsOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <X color="#475569" size={19} strokeWidth={2.2} />
              </Pressable>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SaleOrderItemCard
                  item={item}
                  disabled={disabled}
                  onEdit={handleEditFromAllItems}
                  onIncrement={onIncrement}
                  onDecrement={onDecrement}
                  onRemove={setItemPendingRemoval}
                />
              )}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                <View className="rounded-2xl bg-teal-50 px-4 py-3">
                  <View className="flex-row justify-between">
                    <Text className="text-[12px] font-bold text-teal-800">
                      {items.length} item{items.length === 1 ? "" : "s"}
                    </Text>
                    <Text className="text-[14px] font-extrabold text-teal-900">
                      {formatMoney(totals.itemTotal)}
                    </Text>
                  </View>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <RemoveItemConfirmationSheet
        visible={Boolean(itemPendingRemoval)}
        itemName={itemPendingRemoval?.name ?? ""}
        onCancel={() => setItemPendingRemoval(null)}
        onConfirm={confirmItemRemoval}
      />
    </>
  );
}
