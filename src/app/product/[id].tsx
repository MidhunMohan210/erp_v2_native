import { Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Archive, Edit3, Package } from "lucide-react-native";
import { isAxiosError } from "axios";
import { toast } from "sonner-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { PageError } from "@/components/feedback/PageError";
import { useArchiveProductMutation, useProductDetailQuery } from "@/hooks/queries/productQueries";
import { useAppSelector } from "@/store/hooks";

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyId = useAppSelector((state) => state.company.selectedCompany?._id ?? "");
  const productQuery = useProductDetailQuery(id, companyId);
  const archiveMutation = useArchiveProductMutation();
  const product = productQuery.data;
  const canManage = product?.product_source === "manual";

  const archive = () => Alert.alert("Archive this product?", "It will no longer appear in active product lists or selection screens.", [
    { text: "Cancel", style: "cancel" },
    { text: "Archive", style: "destructive", onPress: () => void archiveMutation.mutateAsync({ cmp_id: companyId, productId: id }).then(() => { toast.success("Product archived"); router.back(); }).catch((error: unknown) => toast.error(isAxiosError(error) && error.response?.data?.message ? error.response.data.message : "Unable to archive product")) },
  ]);

  if (productQuery.isError) return <PageError title="Could not load product" description="Please try again." onRetry={() => void productQuery.refetch()} />;
  if (!product) return <View className="flex-1 items-center justify-center bg-[#f6f8fb]"><Text className="text-slate-500">Loading product…</Text></View>;
  const sourceLabel = product.product_source === "manual" ? "Manual product" : product.product_source === "tally" ? "Tally imported" : "Legacy product";

  return <View className="flex-1 bg-[#f6f8fb]"><ScreenHeader title="Product Details" />
    <View className="m-4 rounded-3xl bg-white p-5"><View className="flex-row items-center"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf1f8]"><Package color="#134074" size={24}/></View><View className="ml-3 flex-1"><Text className="text-lg font-extrabold text-[#17203a]">{product.product_name}</Text><Text className="mt-1 text-sm text-slate-500">{product.product_code || "No product code"}</Text></View></View><View className="mt-4 self-start rounded-full bg-slate-100 px-3 py-1"><Text className="text-xs font-bold text-slate-600">{sourceLabel}</Text></View></View>
    <View className="mx-4 rounded-3xl bg-white p-5"><Text className="font-extrabold text-[#17203a]">Tax & pricing</Text><Text className="mt-3 text-sm text-slate-600">HSN/SAC: {product.hsn_code || "—"}</Text><Text className="mt-1 text-sm text-slate-600">IGST {product.igst ?? 0}% · CGST {product.cgst ?? 0}% · SGST {product.sgst ?? 0}%</Text><Text className="mt-3 text-sm text-slate-600">Balance stock: {product.saleable_stock ?? 0}</Text></View>
    {canManage ? <View className="mt-auto flex-row gap-3 border-t border-slate-200 bg-white p-4"><Pressable onPress={() => router.push({ pathname: "/product-create", params: { id } })} className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#134074] py-3.5"><Edit3 color="#fff" size={18}/><Text className="ml-2 font-bold text-white">Edit</Text></Pressable><Pressable onPress={archive} disabled={archiveMutation.isPending} className="flex-1 flex-row items-center justify-center rounded-2xl bg-rose-50 py-3.5"><Archive color="#e11d48" size={18}/><Text className="ml-2 font-bold text-rose-600">Archive</Text></Pressable></View> : <View className="m-4 rounded-2xl bg-slate-100 p-4"><Text className="text-center text-sm text-slate-600">This {sourceLabel.toLowerCase()} is view-only.</Text></View>}</View>;
}
