import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { companyService } from "@/services/company.service";
import type { Company } from "@/types/company";
import { ScreenHeader } from "@/components/ScreenHeader";

function CompanyCard({
  company,
  onDelete,
  onEdit,
}: {
  company: Company;
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

          <Text numberOfLines={1} className="mt-0.5 text-sm text-slate-500 truncate max-w-[150px]">
            {[company.place, company.state].filter(Boolean).join(", ") ||
              "Location unavailable"}
          </Text>
        </View>
      </View>

      <View className="ml-[10px] flex-row items-center gap-[14px]">
        <Pressable hitSlop={10} onPress={onEdit} className="p-0.5">
          <Pencil color="#475569" size={18} strokeWidth={2.1} />
        </Pressable>
        <Pressable hitSlop={10} onPress={onDelete} className="p-0.5">
          <Trash2 color="#ff0f4b" size={18} strokeWidth={2.1} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CompanyScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const companiesQuery = useQuery({
    queryKey: QUERY_KEYS.companies,
    queryFn: companyService.getCompanies,
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
    Alert.alert(
      "Edit company",
      `${company.name} editing can be connected next.`,
    );
  };

  const handleDeleteCompany = (company: Company) => {
    Alert.alert(
      "Delete company",
      `${company.name} delete flow is not connected yet, so no backend data will be touched.`,
    );
  };

  const handleAddCompany = () => {
    Alert.alert(
      "Add company",
      "The create company screen is not available yet. I can wire this menu item to that route as soon as it exists.",
    );
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
        contentContainerClassName="bg-white px-4 pt-[14px]"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        data={filteredCompanies}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <CompanyCard
            company={item}
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
    </View>
  );
}
