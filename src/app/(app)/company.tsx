import { useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { Landmark, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { toast } from "sonner-native";

import DeleteConfirmSheet from "@/components/DeleteConfirmSheet";
import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { companyService } from "@/services/company.service";
import { useAppSelector } from "@/store/hooks";
import type { Company } from "@/types/company";
import { ScreenHeader } from "@/components/ScreenHeader";
import * as Haptics from "expo-haptics";


function CompanyCard({
  company,
  isDeleteDisabled = false,
  onDelete,
  onEdit,
}: {
  company: Company;
  isDeleteDisabled?: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between rounded-[14px] bg-white px-4 py-[14px] shadow-sm shadow-slate-900/10 border-b border-slate-200">
      <View className="flex-1 flex-row items-center">
        <View className="p-2 items-center justify-center rounded-[10px] bg-slate-200">
          {<Landmark color="#0f172a" size={22} strokeWidth={2.1} />}
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text
              numberOfLines={1}
              className="shrink text-[15px] truncate max-w-[150px] font-extrabold text-[#0f172a]"
            >
              {company.name}
            </Text>
          </View>

          <Text
            numberOfLines={1}
            className="mt-0.5 text-sm text-slate-500 truncate max-w-[150px]"
          >
            {[company.place, company.state].filter(Boolean).join(", ") ||
              "Location unavailable"}
          </Text>
        </View>
      </View>

      <View className="ml-[10px] flex-row items-center gap-[14px]">
        <Pressable hitSlop={10} onPress={onEdit} className="p-0.5">
          <Pencil color="#475569" size={18} strokeWidth={2.1} />
        </Pressable>
        <Pressable
          hitSlop={10}
          onPress={onDelete}
          disabled={isDeleteDisabled}
          className="p-0.5"
        >
          <Trash2
            color={isDeleteDisabled ? "#cbd5e1" : "#ff0f4b"}
            size={18}
            strokeWidth={2.1}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function CompanyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState("");
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const companiesQuery = useQuery({
    queryKey: QUERY_KEYS.companies,
    queryFn: companyService.getCompanies,
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (companyId: string) => companyService.deleteCompany(companyId),
    onSuccess: async () => {
      deleteSheetRef.current?.dismiss();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      setCompanyToDelete(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError:async (error) =>  {
      deleteSheetRef.current?.dismiss();

      // ✅ Extract backend message from axios error
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "We could not delete the company. Please try again.";

      toast.error(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      setCompanyToDelete(null);

    },
  });

  const filteredCompanies = useMemo(() => {
    const search = query.trim().toLowerCase();
    const companies = companiesQuery.data ?? [];

    if (!search) {
      return companies;
    }

    return companies.filter((company) => {
      return [
        company.name,
        company.place,
        company.state,
        company.country,
        company.email,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search));
    });
  }, [companiesQuery.data, query]);

  const handleEditCompany = (company: Company) => {
    router.push({
      pathname: "/company-create",
      params: { id: company._id },
    });
  };

  const handleDeleteCompany = (company: Company) => {
    if (selectedCompany?._id === company._id) {
      toast.error("You cannot delete the currently selected company.");
      return;
    }

    setCompanyToDelete(company);
    deleteSheetRef.current?.present();
  };

  const handleConfirmDelete = () => {
    if (!companyToDelete || deleteCompanyMutation.isPending) {
      return;
    }

    deleteCompanyMutation.mutate(companyToDelete._id);
  };

  const handleAddCompany = () => {
    router.push("/company-create");
  };

  if (companiesQuery.isLoading) {
    return <PageLoader message="Loading companies..." />;
  }

  if (companiesQuery.isError) {
    return (
      <PageError
        description="We could not fetch the company list. Please check the connection and try again."
        onRetry={() => void companiesQuery.refetch()}
        title="Could not load companies"
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader
        title="Companies"
        menuItems={[
          {
            label: "Add company",
            icon: Plus,
            onPress: handleAddCompany,
          },
          {
            label: "Refresh list",
            icon: RefreshCw,
            onPress: () => void companiesQuery.refetch(),
          },
        ]}
        showSearch
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search companies"
      />

      <FlatList
        className="flex-1"
        contentContainerClassName="bg-white px-4 pt-[14px]"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        data={filteredCompanies}
        keyExtractor={(item) => item._id}
        nestedScrollEnabled
        renderItem={({ item }) => (
          <CompanyCard
            company={item}
            isDeleteDisabled={selectedCompany?._id === item._id}
            onDelete={() => handleDeleteCompany(item)}
            onEdit={() => handleEditCompany(item)}
          />
        )}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-6 items-center rounded-[18px] bg-white px-5 py-7">
            <Text className="text-[18px] font-bold text-[#0f172a]">
              No companies found
            </Text>
            <Text className="mt-1.5 text-center text-[14px] text-slate-500">
              Try a different search term or refresh the list.
            </Text>
          </View>
        }
      />

      <DeleteConfirmSheet
        sheetRef={deleteSheetRef}
        title="Delete Company"
        description={
          companyToDelete
            ? `${companyToDelete.name} will be permanently removed.`
            : "This company will be permanently removed."
        }
        onConfirm={handleConfirmDelete}
        isLoading={deleteCompanyMutation.isPending}
      />
    </View>
  );
}
