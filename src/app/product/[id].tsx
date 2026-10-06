import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Archive, Edit3, Package } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { isAxiosError } from "axios";
import { toast } from "sonner-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { PageError } from "@/components/feedback/PageError";
import {
  useArchiveProductMutation,
  useProductDetailQuery,
} from "@/hooks/queries/productQueries";
import { useAppSelector } from "@/store/hooks";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="border-t border-slate-100 py-3">
      <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-semibold text-slate-700">{value}</Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useAppSelector(
    (state) => state.company.selectedCompany?._id ?? "",
  );
  const productQuery = useProductDetailQuery(id, companyId);
  const archiveMutation = useArchiveProductMutation();
  const product = productQuery.data;
  const canManage = product?.product_source === "manual";
  const archive = () =>
    Alert.alert(
      "Archive this product?",
      "It will no longer appear in active product lists or selection screens.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () =>
            void archiveMutation
              .mutateAsync({ cmp_id: companyId, productId: id })
              .then(() => {
                toast.success("Product archived");
                router.back();
              })
              .catch((error: unknown) =>
                toast.error(
                  isAxiosError(error) && error.response?.data?.message
                    ? error.response.data.message
                    : "Unable to archive product",
                ),
              ),
        },
      ],
    );

  if (productQuery.isError)
    return (
      <PageError
        title="Could not load product"
        description="Please try again."
        onRetry={() => void productQuery.refetch()}
      />
    );
  if (!product)
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-500">Loading product…</Text>
      </View>
    );
  const sourceLabel =
    product.product_source === "manual"
      ? "Manual product"
      : "Tally imported"
  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Product Details" />
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: canManage ? 116 : 36 }}
      >
        <View className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-900/10">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
              <Package color="#db2777" size={24} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-lg font-extrabold text-slate-900">
                {product.product_name || "Untitled Product"}
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                {product.product_code || "No product code"}
              </Text>
            </View>
          </View>
          <View
            className={`mt-4 self-start rounded-full px-3 py-1 ${canManage ? "bg-emerald-100" : "bg-blue-100"}`}
          >
            <Text
              className={`text-xs font-bold ${canManage ? "text-emerald-700" : "text-blue-700"}`}
            >
              {sourceLabel}
              {canManage ? "" : " · View only"}
            </Text>
          </View>
        </View>
        <View className="mt-4 rounded-3xl bg-white px-5 shadow-sm shadow-slate-900/10">
          <DetailRow label="HSN / SAC" value={product.hsn_code || "—"} />
          <DetailRow label="Base unit" value={product.base_unit || "—"} />
          <DetailRow label="Alternate unit" value={product.alt_unit || "—"} />
          <DetailRow
            label="Saleable stock"
            value={String(product.saleable_stock ?? 0)}
          />
        </View>
        <View className="mt-4 rounded-3xl bg-white px-5 shadow-sm shadow-slate-900/10">
          <DetailRow label="IGST" value={`${product.igst ?? 0}%`} />
          <DetailRow label="CGST" value={`${product.cgst ?? 0}%`} />
          <DetailRow label="SGST" value={`${product.sgst ?? 0}%`} />
        </View>
        {!canManage ? (
          <View className="mt-4 rounded-2xl bg-slate-100 p-4">
            <Text className="text-center text-sm text-slate-600">
              This Tally-imported product is read-only. Edit and delete actions
              are intentionally unavailable.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      {canManage ? (
        <View className="flex-row gap-3 border-t border-slate-200 bg-white p-4">
          <Pressable
            onPress={() =>
              router.push({ pathname: "/product-create", params: { id } })
            }
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#134074] py-3.5"
          >
            <Edit3 color="#fff" size={18} />
            <Text className="ml-2 font-bold text-white">Edit</Text>
          </Pressable>
          <Pressable
            onPress={archive}
            disabled={archiveMutation.isPending}
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-rose-50 py-3.5"
          >
            <Archive color="#e11d48" size={18} />
            <Text className="ml-2 font-bold text-rose-600">Archive</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
