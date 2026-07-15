import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { Field, PickerList, PrimaryButton, SectionCard } from "@/components/vouchers/VoucherUi";
import { useInfinitePartyListQuery } from "@/hooks/queries/partyQueries";
import { useInfiniteProductListQuery } from "@/hooks/queries/productQueries";
import { useVoucherSeriesListQuery, voucherListQueryKeys } from "@/hooks/queries/voucherQueries";
import { saleOrderService } from "@/services/saleOrder.service";
import { useAppSelector } from "@/store/hooks";
import { getTodayDateString } from "@/utils/voucher";

export default function SaleOrderCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const cmp_id = selectedCompany?._id ?? "";

  const [date, setDate] = useState(getTodayDateString());
  const [partySearch, setPartySearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const seriesQuery = useVoucherSeriesListQuery(cmp_id, "saleOrder", Boolean(cmp_id));
  const partiesQuery = useInfinitePartyListQuery({
    cmp_id,
    search: partySearch,
    limit: 20,
    partyType: "party",
    enabled: Boolean(cmp_id),
  });
  const productsQuery = useInfiniteProductListQuery({
    cmp_id,
    search: productSearch,
    limit: 20,
    enabled: Boolean(cmp_id),
  });

  const seriesList = seriesQuery.data?.series ?? [];
  const parties = useMemo(
    () => partiesQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [partiesQuery.data],
  );
  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [productsQuery.data],
  );

  const selectedSeries = seriesList.find((item) => item._id === seriesId);
  const selectedParty = parties.find((item) => item._id === partyId);
  const selectedProduct = products.find((item) => item._id === productId);

  const handleSave = async () => {
    if (!cmp_id) {
      toast.error("Select a company first");
      return;
    }
    if (!selectedSeries) {
      toast.error("Select a voucher series");
      return;
    }
    if (!selectedParty) {
      toast.error("Select a customer");
      return;
    }
    if (!selectedProduct) {
      toast.error("Select a product");
      return;
    }
    if ((Number(quantity) || 0) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if ((Number(rate) || 0) <= 0) {
      toast.error("Rate must be greater than 0");
      return;
    }

    try {
      setIsSaving(true);
      await saleOrderService.createSimpleSaleOrder({
        cmp_id,
        date,
        party: selectedParty,
        product: selectedProduct,
        selectedSeries,
        quantity: Number(quantity),
        rate: Number(rate),
      });

      await queryClient.invalidateQueries({
        queryKey: voucherListQueryKeys.list(cmp_id, "saleOrder", date),
      });
      toast.success("Sale order created");
      router.replace({
        pathname: "/voucher-list",
        params: { voucherType: "saleOrder" },
      });
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "Failed to create sale order";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Create Sale Order" />
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <SectionCard
          title="Voucher Details"
          description="This is a minimal first version that uses one customer, one product, and one series."
        >
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Field
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="1"
            keyboardType="numeric"
          />
          <Field
            label="Rate"
            value={rate}
            onChangeText={setRate}
            placeholder="Enter item rate"
            keyboardType="numeric"
          />
        </SectionCard>

        <SectionCard title="Select Series">
          {seriesList.length === 0 ? (
            <View>
              <Text className="mb-3 text-[13px] text-slate-500">
                No sale order series found yet.
              </Text>
              <PrimaryButton
                label="Create Sale Order Series"
                onPress={() => router.push({
                  pathname: "/voucher-series-form",
                  params: { voucherType: "saleOrder" },
                })}
              />
            </View>
          ) : (
            seriesList.map((item) => (
              <View key={item._id} className="mb-3">
                <PrimaryButton
                  label={`${item.seriesName}${seriesId === item._id ? " (Selected)" : ""}`}
                  secondary={seriesId !== item._id}
                  onPress={() => setSeriesId(item._id)}
                />
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Select Customer">
          <PickerList
            title="Customer"
            searchValue={partySearch}
            onSearchChange={setPartySearch}
            searchPlaceholder="Search customers"
            options={parties.map((item) => ({
              id: item._id,
              label: item.partyName || "Untitled Customer",
              subtitle: item.mobileNumber || item.emailID || "No contact details",
            }))}
            selectedId={partyId}
            emptyText="No customers found"
            onSelect={setPartyId}
          />
        </SectionCard>

        <SectionCard title="Select Product">
          <PickerList
            title="Product"
            searchValue={productSearch}
            onSearchChange={setProductSearch}
            searchPlaceholder="Search products"
            options={products.map((item) => ({
              id: item._id || "",
              label: item.product_name || "Untitled Product",
              subtitle: item.product_code || item.unit || "No product code",
            }))}
            selectedId={productId}
            emptyText="No products found"
            onSelect={setProductId}
          />
        </SectionCard>

        <PrimaryButton
          label={isSaving ? "Creating..." : "Create Sale Order"}
          disabled={isSaving}
          onPress={() => void handleSave()}
        />
      </ScrollView>
    </View>
  );
}
