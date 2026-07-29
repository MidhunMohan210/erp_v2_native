import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useBrandListQuery,
  useCategoryListQuery,
  useSubcategoryListQuery,
} from "@/hooks/queries/productQueries";
import type { ProductFilterOption } from "@/types/product";

export type ProductFilters = {
  brandId: string;
  categoryId: string;
  subcategoryId: string;
};

type ProductFilterModalProps = {
  visible: boolean;
  companyId: string;
  appliedFilters: ProductFilters;
  onClose: () => void;
  onApply: (filters: ProductFilters) => void;
};

type FilterChipsProps = {
  emptyLabel: string;
  options: ProductFilterOption[];
  selectedId: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
};

function FilterChips({
  emptyLabel,
  options,
  selectedId,
  disabled = false,
  onSelect,
}: FilterChipsProps) {
  return (
    <View className={`flex-row flex-wrap gap-2 ${disabled ? "opacity-50" : ""}`}>
      <Pressable
        disabled={disabled}
        onPress={() => onSelect("")}
        className={`rounded-full border px-3.5 py-2 ${
          selectedId === ""
            ? "border-[#004178] bg-[#EAF2F8]"
            : "border-slate-200 bg-white"
        }`}
      >
        <Text className="text-[12px] font-semibold text-slate-700">
          {emptyLabel}
        </Text>
      </Pressable>

      {options.map((option) => (
        <Pressable
          key={option.id}
          disabled={disabled}
          onPress={() => onSelect(option.id)}
          className={`rounded-full border px-3.5 py-2 ${
            selectedId === option.id
              ? "border-[#004178] bg-[#EAF2F8]"
              : "border-slate-200 bg-white"
          }`}
        >
          <Text className="text-[12px] font-semibold text-slate-700">
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ProductFilterModal({
  visible,
  companyId,
  appliedFilters,
  onClose,
  onApply,
}: ProductFilterModalProps) {
  const insets = useSafeAreaInsets();
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const brandsQuery = useBrandListQuery(companyId, visible);
  const categoriesQuery = useCategoryListQuery(companyId, visible);
  const subcategoriesQuery = useSubcategoryListQuery(companyId, visible);

  useEffect(() => {
    if (visible) setDraftFilters(appliedFilters);
  }, [appliedFilters, visible]);

  const visibleSubcategories = useMemo(() => {
    if (!draftFilters.categoryId) return [];
    return (subcategoriesQuery.data ?? []).filter(
      (option) => option.categoryId === draftFilters.categoryId,
    );
  }, [draftFilters.categoryId, subcategoriesQuery.data]);

  const isLoading =
    brandsQuery.isLoading ||
    categoriesQuery.isLoading ||
    subcategoriesQuery.isLoading;
  const hasError =
    brandsQuery.isError ||
    categoriesQuery.isError ||
    subcategoriesQuery.isError;

  const resetFilters = () => {
    setDraftFilters({ brandId: "", categoryId: "", subcategoryId: "" });
  };

  const applyFilters = () => {
    onApply(draftFilters);
    onClose();
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
          className="max-h-[85%] rounded-t-[28px] bg-white px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[18px] font-extrabold text-slate-900">
                Filter products
              </Text>
              <Text className="mt-1 text-[12px] text-slate-500">
                Narrow the list by product grouping.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close product filters"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X color="#475569" size={19} strokeWidth={2.2} />
            </Pressable>
          </View>

          {isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#004178" />
              <Text className="mt-3 text-[12px] text-slate-500">
                Loading filters...
              </Text>
            </View>
          ) : hasError ? (
            <View className="my-8 rounded-2xl bg-rose-50 px-4 py-4">
              <Text className="text-[12px] text-rose-700">
                Product filters could not be loaded. Close and try again.
              </Text>
            </View>
          ) : (
            <ScrollView
              className="mt-5"
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <Text className="mb-2.5 text-[12px] font-bold text-slate-700">
                Brand
              </Text>
              <FilterChips
                emptyLabel="All brands"
                options={brandsQuery.data ?? []}
                selectedId={draftFilters.brandId}
                onSelect={(brandId) =>
                  setDraftFilters((current) => ({ ...current, brandId }))
                }
              />

              <Text className="mb-2.5 mt-5 text-[12px] font-bold text-slate-700">
                Category
              </Text>
              <FilterChips
                emptyLabel="All categories"
                options={categoriesQuery.data ?? []}
                selectedId={draftFilters.categoryId}
                onSelect={(categoryId) =>
                  setDraftFilters((current) => ({
                    ...current,
                    categoryId,
                    subcategoryId: "",
                  }))
                }
              />

              <Text className="mb-2.5 mt-5 text-[12px] font-bold text-slate-700">
                Subcategory
              </Text>
              {draftFilters.categoryId ? (
                <FilterChips
                  emptyLabel="All subcategories"
                  options={visibleSubcategories}
                  selectedId={draftFilters.subcategoryId}
                  onSelect={(subcategoryId) =>
                    setDraftFilters((current) => ({
                      ...current,
                      subcategoryId,
                    }))
                  }
                />
              ) : (
                <View className="rounded-xl bg-slate-50 px-4 py-3">
                  <Text className="text-[12px] text-slate-500">
                    Select a category to see its subcategories.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          <View className="flex-row gap-3 border-t border-slate-100 pt-3">
            <Pressable
              disabled={isLoading || hasError}
              onPress={resetFilters}
              className="flex-1 items-center rounded-xl border border-slate-300 py-3.5"
            >
              <Text className="text-[13px] font-bold text-slate-700">Reset</Text>
            </Pressable>
            <Pressable
              disabled={isLoading || hasError}
              onPress={applyFilters}
              className={`flex-1 items-center rounded-xl py-3.5 ${
                isLoading || hasError ? "bg-slate-300" : "bg-[#004178]"
              }`}
            >
              <Text className="text-[13px] font-bold text-white">Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
