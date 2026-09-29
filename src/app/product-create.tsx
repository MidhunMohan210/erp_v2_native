import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { isAxiosError } from "axios";
import {
  Boxes,
  ChevronDown,
  CircleDollarSign,
  Layers3,
  MapPin,
  Package,
  ReceiptText,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
} from "lucide-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { Field, PrimaryButton } from "@/components/vouchers/VoucherUi";
import {
  useBrandListQuery,
  useCategoryListQuery,
  useCreateProductMutation,
  useGodownListQuery,
  usePriceLevelListQuery,
  useSubcategoryListQuery,
} from "@/hooks/queries/productQueries";
import { useTaxClassificationListQuery } from "@/hooks/queries/taxClassificationQueries";
import { useAppSelector } from "@/store/hooks";
import { UNIT_OPTIONS } from "@/constants/units";
import type {
  CreateProductPayload,
  ProductFilterOption,
} from "@/types/product";

type LocationDraft = { key: string; godown: string; balance_stock: string };
type PriceLevelDraft = {
  key: string;
  priceLevel: string;
  priceRate: string;
  priceDisc: string;
};
type Errors = Record<string, string>;
type ProductSectionProps = {
  title: string;
  description?: string;
  icon: React.ComponentType<{
    color: string;
    size: number;
    strokeWidth: number;
  }>;
  children: React.ReactNode;
};

const newLocation = (): LocationDraft => ({
  key: String(Math.random()),
  godown: "",
  balance_stock: "",
});
const newPriceLevel = (): PriceLevelDraft => ({
  key: String(Math.random()),
  priceLevel: "",
  priceRate: "",
  priceDisc: "0",
});

function ProductSection({
  title,
  description,
  icon: Icon,
  children,
}: ProductSectionProps) {
  return (
    <View className="mb-4 rounded-[24px] border border-slate-100 bg-white px-4 py-5 shadow-sm">
      <View className="flex-row items-start">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#eaf1f8]">
          <Icon color="#134074" size={20} strokeWidth={2.25} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-extrabold text-[#17203a]">
            {title}
          </Text>
          {description ? (
            <Text className="mt-0.5 text-[12px] leading-4 text-slate-500">
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="mt-5">{children}</View>
    </View>
  );
}

function Selector({
  label,
  value,
  options,
  onChange,
  emptyText = "Select",
}: {
  label: string;
  value: string;
  options: ProductFilterOption[];
  onChange: (value: string) => void;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.id === value);
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <View className="mb-3">
      <Text className="mb-2 text-[13px] font-semibold text-slate-700">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        className={`flex-row items-center justify-between rounded-[14px] border px-4 py-3.5 ${open ? "border-[#134074] bg-[#f7fbff]" : "border-slate-200 bg-slate-50"}`}
      >
        <Text
          numberOfLines={1}
          className={`flex-1 text-[14px] ${selected ? "font-medium text-slate-900" : "text-slate-400"}`}
        >
          {selected?.label ?? emptyText}
        </Text>
        <ChevronDown
          color={open ? "#134074" : "#64748b"}
          size={18}
          strokeWidth={2.25}
        />
      </Pressable>
      {open ? (
        <View className="mt-2 overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
          {options.length > 6 ? (
            <View className="m-3 flex-row items-center rounded-xl bg-slate-100 px-3">
              <Search color="#64748b" size={16} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search options"
                placeholderTextColor="#94a3b8"
                className="ml-2 flex-1 py-2.5 text-[13px] text-slate-900"
              />
            </View>
          ) : null}
          <ScrollView nestedScrollEnabled className="max-h-48">
            {visibleOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  onChange(option.id);
                  setOpen(false);
                  setSearch("");
                }}
                className={`px-4 py-3 ${option.id === value ? "bg-[#eaf1f8]" : "bg-white"}`}
              >
                <Text
                  className={`text-[14px] ${option.id === value ? "font-bold text-[#134074]" : "text-slate-700"}`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
            {visibleOptions.length === 0 ? (
              <Text className="px-4 py-4 text-[13px] text-slate-500">
                No matching options.
              </Text>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export default function ProductCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const companyId = useAppSelector(
    (state) => state.company.selectedCompany?._id ?? "",
  );
  const [errors, setErrors] = useState<Errors>({});
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [baseUnit, setBaseUnit] = useState("");
  const [altUnit, setAltUnit] = useState("");
  const [denominator, setDenominator] = useState("");
  const [conversion, setConversion] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [mrp, setMrp] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [balanceStock, setBalanceStock] = useState("0");
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [gdnEnabled, setGdnEnabled] = useState(false);
  const [locations, setLocations] = useState<LocationDraft[]>([]);
  const [priceLevels, setPriceLevels] = useState<PriceLevelDraft[]>([]);
  const hsnQuery = useTaxClassificationListQuery(companyId);
  const brands = useBrandListQuery(companyId);
  const categories = useCategoryListQuery(companyId);
  const subcategories = useSubcategoryListQuery(companyId);
  const godowns = useGodownListQuery(companyId);
  const levels = usePriceLevelListQuery(companyId);
  const createMutation = useCreateProductMutation();

  const onValueHsns = useMemo(
    () =>
      (hsnQuery.data ?? []).filter(
        (item) => item.calculation_mode === "on_value",
      ),
    [hsnQuery.data],
  );
  const selectedHsn =
    onValueHsns.find((item) => item.hsn_code === hsnCode) ??
    hsnQuery.data?.find((item) => item.hsn_code === hsnCode);
  const subcategoryOptions = useMemo(
    () =>
      (subcategories.data ?? []).filter(
        (item) => !category || item.categoryId === category,
      ),
    [category, subcategories.data],
  );

  const submit = async () => {
    const nextErrors: Errors = {};
    const number = (value: string, field: string, required = false) => {
      if (!value.trim()) {
        if (required) nextErrors[field] = "Required";
        return undefined;
      }
      const result = Number(value);
      if (!Number.isFinite(result) || result < 0) {
        nextErrors[field] = "Enter a valid non-negative number";
        return undefined;
      }
      return result;
    };
    if (!name.trim()) nextErrors.name = "Product name is required";
    if (!baseUnit.trim()) nextErrors.baseUnit = "Base unit is required";
    if (!hsnCode) nextErrors.hsn = "Select an HSN/SAC";
    const base_denominator = number(
      denominator,
      "denominator",
      Boolean(altUnit),
    );
    const alt_conversion = number(conversion, "conversion", Boolean(altUnit));
    if (
      altUnit &&
      (!(base_denominator && base_denominator > 0) ||
        !(alt_conversion && alt_conversion > 0))
    )
      nextErrors.conversion =
        "Both conversion values must be greater than zero";
    // Location rows do not expose batch editing; enabled products use one default batch.
    const GodownList = locations.map((row, index) => ({
      godown: row.godown,
      balance_stock: number(row.balance_stock, `location.${index}.stock`, true),
      batch: batchEnabled ? "Primary Batch" : "",
    }));
    locations.forEach((row, index) => {
      if (!row.godown)
        nextErrors[`location.${index}.godown`] = "Select a location";
    });
    const uniqueLocations = new Set(GodownList.map((row) => row.godown));
    if (uniqueLocations.size !== GodownList.length)
      nextErrors.locations = "Each godown can be added only once";
    const mappedLevels = priceLevels.map((row, index) => ({
      priceLevel: row.priceLevel,
      priceRate: number(row.priceRate, `level.${index}.rate`, true),
      priceDisc: number(row.priceDisc, `level.${index}.disc`) ?? 0,
    }));
    if (
      new Set(mappedLevels.map((row) => row.priceLevel)).size !==
        mappedLevels.length ||
      mappedLevels.some((row) => !row.priceLevel)
    )
      nextErrors.priceLevels = "Choose a different price level for each row";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload: CreateProductPayload = {
      product_name: name.trim(),
      product_code: code.trim() || undefined,
      base_unit: baseUnit.trim(),
      alt_unit: altUnit.trim() || undefined,
      ...(altUnit ? { base_denominator, alt_conversion } : {}),
      hsn_code: hsnCode,
      purchase_price: number(purchasePrice, "purchasePrice"),
      purchase_cost: number(purchaseCost, "purchaseCost"),
      item_mrp: number(mrp, "mrp"),
      saleable_stock: number(balanceStock, "balanceStock", true),
      brand: brand || undefined,
      category: category || undefined,
      sub_category: subCategory || undefined,
      batchEnabled,
      gdnEnabled,
      ...(locations.length
        ? { GodownList: GodownList as CreateProductPayload["GodownList"] }
        : {}),
      ...(priceLevels.length
        ? { priceLevels: mappedLevels as CreateProductPayload["priceLevels"] }
        : {}),
    };
    try {
      await createMutation.mutateAsync({ cmp_id: companyId, payload });
      toast.success("Product created");
      router.back();
    } catch (error) {
      toast.error(
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to create product",
      );
    }
  };

  return (
    <View className="flex-1 bg-[#f6f8fb]">
      <ScreenHeader title="Add Product" />
      <KeyboardAwareScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        enableOnAndroid
        extraScrollHeight={24}
      >

        <ProductSection
          title="Basic information"
          description="The name and selling unit are required."
          icon={Package}
        >
          <Field
            required
            label="Product Name"
            value={name}
            onChangeText={setName}
            errorText={errors.name}
          />
          <Field
            label="Product Code"
            value={code}
            onChangeText={setCode}
            placeholder="Optional internal code"
          />
          <Selector
            label="Base Unit *"
            value={baseUnit}
            options={UNIT_OPTIONS}
            onChange={setBaseUnit}
            emptyText="Select base unit"
          />
          {errors.baseUnit ? (
            <Text className="-mt-2 mb-2 text-[12px] text-rose-500">
              {errors.baseUnit}
            </Text>
          ) : null}
        </ProductSection>

        <ProductSection
          title="Unit configuration"
          description="Add an alternate unit only when you sell in another measure."
          icon={SlidersHorizontal}
        >
          <Selector
            label="Alternate Unit"
            value={altUnit}
            options={UNIT_OPTIONS}
            onChange={setAltUnit}
            emptyText="Select alternate unit"
          />
          {altUnit ? (
            <>
              <Field
                required
                label="Base Denominator"
                value={denominator}
                onChangeText={setDenominator}
                keyboardType="numeric"
                errorText={errors.denominator}
              />
              <Field
                required
                label="Alternate Conversion"
                value={conversion}
                onChangeText={setConversion}
                keyboardType="numeric"
                errorText={errors.conversion}
              />
            </>
          ) : null}
        </ProductSection>

        <ProductSection
          title="HSN & tax"
          description="Select the On Value classification for this product."
          icon={ReceiptText}
        >
          <Selector
            label="HSN/SAC *"
            value={hsnCode}
            options={onValueHsns.map((item) => ({
              id: item.hsn_code,
              label: `${item.hsn_code}${item.description ? ` — ${item.description}` : ""}`,
            }))}
            onChange={setHsnCode}
            emptyText="Select HSN/SAC"
          />
          {errors.hsn ? (
            <Text className="mt-2 text-[12px] text-rose-500">{errors.hsn}</Text>
          ) : null}
          {selectedHsn?.on_value ? (
            <View className="mt-4 rounded-2xl border border-[#cfe0f1] bg-[#eef6fd] p-4">
              <Text className="text-[14px] font-bold text-[#134074]">
                {selectedHsn.description}
              </Text>
              <Text className="mt-1 text-[11px] text-slate-500">
                Applied from the selected HSN/SAC master
              </Text>
              <View className="mt-4 flex-row border-t border-[#cfe0f1] pt-3">
                <View className="flex-1">
                  <Text className="text-[11px] font-medium text-slate-500">
                    IGST
                  </Text>
                  <Text className="mt-1 text-[17px] font-extrabold text-[#134074]">
                    {selectedHsn.on_value.igst_rate}%
                  </Text>
                </View>
                <View className="flex-1 border-l border-[#cfe0f1] pl-3">
                  <Text className="text-[11px] font-medium text-slate-500">
                    CGST
                  </Text>
                  <Text className="mt-1 text-[17px] font-extrabold text-[#134074]">
                    {selectedHsn.on_value.cgst_rate}%
                  </Text>
                </View>
                <View className="flex-1 border-l border-[#cfe0f1] pl-3">
                  <Text className="text-[11px] font-medium text-slate-500">
                    SGST
                  </Text>
                  <Text className="mt-1 text-[17px] font-extrabold text-[#134074]">
                    {selectedHsn.on_value.sgst_utgst_rate}%
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </ProductSection>

        <ProductSection
          title="Pricing"
          description="All price fields are optional and can be updated later."
          icon={CircleDollarSign}
        >
          <Field
            label="Purchase Price"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <Field
            label="Purchase Cost"
            value={purchaseCost}
            onChangeText={setPurchaseCost}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <Field
            label="MRP"
            value={mrp}
            onChangeText={setMrp}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </ProductSection>

        <ProductSection
          title="Product classification"
          description="Use these labels to organise and filter your catalogue."
          icon={Tag}
        >
          <Selector
            label="Brand"
            value={brand}
            options={brands.data ?? []}
            onChange={setBrand}
          />
          <Selector
            label="Category"
            value={category}
            options={categories.data ?? []}
            onChange={(value) => {
              setCategory(value);
              setSubCategory("");
            }}
          />
          <Selector
            label="Subcategory"
            value={subCategory}
            options={subcategoryOptions}
            onChange={setSubCategory}
          />
        </ProductSection>

        <ProductSection
          title=" Stock"
          description="This overall balance remains separate from stock per location."
          icon={Boxes}
        >
          <Field
            required
            label="Saleable Stock"
            value={balanceStock}
            onChangeText={setBalanceStock}
            keyboardType="numeric"
            errorText={errors.balanceStock}
          />
        </ProductSection>

        <ProductSection
          title="Stock configuration"
          description="Enable these only when your stock process needs them."
          icon={Layers3}
        >
          <View className="flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-3.5">
            <View>
              <Text className="font-semibold text-slate-800">
                Batch tracking
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-500">
                Uses “Primary Batch” automatically
              </Text>
            </View>
            <Switch
              value={batchEnabled}
              onValueChange={setBatchEnabled}
              trackColor={{ false: "#cbd5e1", true: "#7ca2c9" }}
              thumbColor={batchEnabled ? "#134074" : "#ffffff"}
            />
          </View>
          <View className="mt-2 flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-3.5">
            <View>
              <Text className="font-semibold text-slate-800">
                Godown tracking
              </Text>
              <Text className="mt-0.5 text-[11px] text-slate-500">
                Manage stock across multiple locations
              </Text>
            </View>
            <Switch
              value={gdnEnabled}
              onValueChange={setGdnEnabled}
              trackColor={{ false: "#cbd5e1", true: "#7ca2c9" }}
              thumbColor={gdnEnabled ? "#134074" : "#ffffff"}
            />
          </View>
        </ProductSection>

        <ProductSection
          title="Location stock"
          description="Leave this empty to use the backend default zero-stock location."
          icon={MapPin}
        >
          {errors.locations ? (
            <Text className="mb-2 text-[12px] text-rose-500">
              {errors.locations}
            </Text>
          ) : null}
          {locations.map((row, index) => (
            <View
              key={row.key}
              className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
            >
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="font-bold text-slate-800">
                  Location {index + 1}
                </Text>
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    setLocations(
                      locations.filter((item) => item.key !== row.key),
                    )
                  }
                  className="h-8 w-8 items-center justify-center rounded-full bg-rose-50"
                >
                  <Trash2 color="#e11d48" size={16} />
                </Pressable>
              </View>
              <Selector
                label="Godown"
                value={row.godown}
                options={godowns.data ?? []}
                onChange={(godown) =>
                  setLocations(
                    locations.map((item) =>
                      item.key === row.key ? { ...item, godown } : item,
                    ),
                  )
                }
              />
              <Field
                required
                label="Location Stock"
                value={row.balance_stock}
                onChangeText={(balance_stock) =>
                  setLocations(
                    locations.map((item) =>
                      item.key === row.key ? { ...item, balance_stock } : item,
                    ),
                  )
                }
                keyboardType="numeric"
                errorText={errors[`location.${index}.stock`]}
              />
            </View>
          ))}
          <PrimaryButton
            secondary
            label="+ Add Location"
            onPress={() => setLocations([...locations, newLocation()])}
          />
        </ProductSection>

        <ProductSection
          title="Price levels"
          description="Set customer-specific rates when needed."
          icon={CircleDollarSign}
        >
          {errors.priceLevels ? (
            <Text className="mb-2 text-[12px] text-rose-500">
              {errors.priceLevels}
            </Text>
          ) : null}
          {priceLevels.map((row, index) => (
            <View
              key={row.key}
              className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
            >
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="font-bold text-slate-800">
                  Price Level {index + 1}
                </Text>
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    setPriceLevels(
                      priceLevels.filter((item) => item.key !== row.key),
                    )
                  }
                  className="h-8 w-8 items-center justify-center rounded-full bg-rose-50"
                >
                  <Trash2 color="#e11d48" size={16} />
                </Pressable>
              </View>
              <Selector
                label="Price Level"
                value={row.priceLevel}
                options={(levels.data ?? []).map((item) => ({
                  id: item._id,
                  label: item.pricelevel ?? item.name ?? "Unnamed",
                }))}
                onChange={(priceLevel) =>
                  setPriceLevels(
                    priceLevels.map((item) =>
                      item.key === row.key ? { ...item, priceLevel } : item,
                    ),
                  )
                }
              />
              <Field
                required
                label="Rate"
                value={row.priceRate}
                onChangeText={(priceRate) =>
                  setPriceLevels(
                    priceLevels.map((item) =>
                      item.key === row.key ? { ...item, priceRate } : item,
                    ),
                  )
                }
                keyboardType="numeric"
                errorText={errors[`level.${index}.rate`]}
              />
              <Field
                label="Discount"
                value={row.priceDisc}
                onChangeText={(priceDisc) =>
                  setPriceLevels(
                    priceLevels.map((item) =>
                      item.key === row.key ? { ...item, priceDisc } : item,
                    ),
                  )
                }
                keyboardType="numeric"
              />
            </View>
          ))}
          <PrimaryButton
            secondary
            label="+ Add Price Level"
            onPress={() => setPriceLevels([...priceLevels, newPriceLevel()])}
          />
        </ProductSection>
      </KeyboardAwareScrollView>
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="border-t border-slate-200 bg-white px-4 pt-3"
      >
        <PrimaryButton
          label={createMutation.isPending ? "Creating..." : "Create Product"}
          disabled={createMutation.isPending || !companyId}
          onPress={() => void submit()}
          extraStyles="py-4"
        />
      </View>
    </View>
  );
}
