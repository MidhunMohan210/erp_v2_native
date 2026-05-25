import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Building2, ChevronLeft, Pencil, Plus, Search, Trash2 } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { companyService } from "@/services/company.service";
import type { Company } from "@/types/company";

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
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.logoWrap}>
          {company.logo ? (
            <Image source={{ uri: company.logo }} style={styles.logoImage} />
          ) : (
            <Building2 color="#0f172a" size={22} strokeWidth={2.1} />
          )}
        </View>

        <View style={styles.cardText}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.companyName}>
              {company.name}
            </Text>
          </View>

          <Text numberOfLines={1} style={styles.companyMeta}>
            {[company.place, company.state].filter(Boolean).join(", ") ||
              "Location unavailable"}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable hitSlop={10} onPress={onEdit} style={styles.iconButton}>
          <Pencil color="#475569" size={18} strokeWidth={2.1} />
        </Pressable>
        <Pressable hitSlop={10} onPress={onDelete} style={styles.iconButton}>
          <Trash2 color="#ff0f4b" size={18} strokeWidth={2.1} />
        </Pressable>
      </View>
    </View>
  );
}

export default function CompanyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);

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
      return [company.name, company.place, company.state, company.country, company.email]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search));
    });
  }, [companiesQuery.data, query]);

  const handleEditCompany = (company: Company) => {
    Alert.alert("Edit company", `${company.name} editing can be connected next.`);
  };

  const handleDeleteCompany = (company: Company) => {
    Alert.alert(
      "Delete company",
      `${company.name} delete flow is not connected yet, so no backend data will be touched.`,
    );
  };

  const handleAddCompany = () => {
    setMenuVisible(false);
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
        description="We could not fetch the company list from /api/company. Please check the connection and try again."
        onRetry={() => void companiesQuery.refetch()}
        title="Could not load companies"
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topSection, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow}>
          <Pressable
            hitSlop={10}
            onPress={() => router.replace("/(app)/home")}
            style={styles.navButton}
          >
            <ChevronLeft color="#2563eb" size={24} strokeWidth={2.4} />
          </Pressable>

          <Text style={styles.headerTitle}>Company</Text>

          <Menu
            anchor={
              <Pressable
                hitSlop={10}
                onPress={() => setMenuVisible(true)}
                style={styles.navButton}
              >
                <Text style={styles.moreDots}>⋮</Text>
              </Pressable>
            }
            onDismiss={() => setMenuVisible(false)}
            visible={menuVisible}
            contentStyle={styles.menuContent}
          >
            <Menu.Item
              leadingIcon={() => <Plus color="#134074" size={18} strokeWidth={2.2} />}
              onPress={handleAddCompany}
              title="Add company"
            />
            <Menu.Item
              leadingIcon="refresh"
              onPress={() => {
                setMenuVisible(false);
                void companiesQuery.refetch();
              }}
              title="Refresh list"
            />
          </Menu>
        </View>

        <View style={styles.searchWrap}>
          <Search color="#94a3b8" size={24} strokeWidth={2.1} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search companies"
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            value={query}
          />
        </View>
      </View>

      <FlatList
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
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
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No companies found</Text>
            <Text style={styles.emptyDescription}>
              Try a different search term or refresh the list.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginLeft: 10,
  },
  card: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  cardLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  cardText: {
    flex: 1,
    marginLeft: 12,
  },
  companyMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  companyName: {
    color: "#0f172a",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyDescription: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    color: "#17203a",
    fontSize: 18,
    fontWeight: "800",
  },
  iconButton: {
    padding: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  logoImage: {
    borderRadius: 10,
    height: 24,
    width: 24,
  },
  logoWrap: {
    alignItems: "center",
    backgroundColor: "#e2e8f0",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  menuContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginTop: 12,
  },
  moreDots: {
    color: "#334155",
    fontSize: 28,
    lineHeight: 28,
  },
  navButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  screen: {
    backgroundColor: "#f8f7f4",
    flex: 1,
  },
  searchInput: {
    color: "#17203a",
    flex: 1,
    fontSize: 15,
    marginLeft: 10,
    paddingVertical: 0,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8dee9",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    height: 48,
    paddingHorizontal: 14,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  topSection: {
    backgroundColor: "#f8f7f4",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
