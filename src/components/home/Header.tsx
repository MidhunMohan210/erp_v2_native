import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LogOut, Power } from "lucide-react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";

import CompanySwitchOverlay from "@/components/company/CompanySwitchOverlay";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { companyService } from "@/services/company.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { persistSelectedCompany } from "@/store/companySlice";
import { logoutAuth } from "@/store/authSlice";
import manLogo from "../../../assets/home/man.png";
import type { Company } from "@/types/company";
import { queryClient } from "@/lib/queryClient";

const COMPANY_SHEET_SNAP_POINTS = ["52%"];
const LOGOUT_SHEET_SNAP_POINTS = ["34%"];

export default function Header() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);
  const { name, role } = user || {};
  const companySheetRef = useRef<BottomSheetModal>(null);
  const logoutSheetRef = useRef<BottomSheetModal>(null);
  const [isSwitchingCompany, setIsSwitchingCompany] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [switchingCompanyName, setSwitchingCompanyName] = useState<
    string | null
  >(null);

  const companiesQuery = useQuery({
    queryKey: QUERY_KEYS.companies,
    queryFn: companyService.getCompanies,
  });

  useEffect(() => {
    if (isCompanyLoading || !companiesQuery.data?.length) return;

    // A missing or revoked saved selection requires an explicit choice.
    if (!selectedCompany) return;

    const currentCompany = companiesQuery.data.find(
      (company) => company._id === selectedCompany._id,
    );
    if (
      currentCompany &&
      (currentCompany.state ?? "") !== selectedCompany.state
    ) {
      // Replaces an older persisted summary that did not include `state` with
      // the complete API company record used for Sale tax-mode selection.
      void dispatch(persistSelectedCompany(currentCompany));
    }
  }, [companiesQuery.data, dispatch, isCompanyLoading, selectedCompany]);

  const handleSelectCompany = async (company: Company) => {
    if (isSwitchingCompany) {
      return;
    }

    if (selectedCompany?._id === company._id) {
      companySheetRef.current?.dismiss();
      return;
    }

    setSwitchingCompanyName(company.name);
    setIsSwitchingCompany(true);
    companySheetRef.current?.dismiss();

    try {
      await dispatch(persistSelectedCompany(company));
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      setIsSwitchingCompany(false);
      setSwitchingCompanyName(null);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    logoutSheetRef.current?.dismiss();
    queryClient.clear();
    try {
      await dispatch(logoutAuth());
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <CompanySwitchOverlay
        open={isSwitchingCompany}
        companyName={switchingCompanyName}
      />
      <View className="flex-row items-center justify-between px-6 pt-10 pb-4">
        <View className="flex-row items-center mb-4">
          {/* Placeholder Avatar */}
          <View className="w-14 h-14 bg-white/90 rounded-full items-center justify-center mr-3 overflow-hidden">
            <Image source={manLogo} className="w-12 h-12" resizeMode="cover" />
          </View>
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-bold text-lg capitalize">
                {name}
              </Text>
              <Text className="text-white text-sm opacity-90 capitalize">
                ({role})
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => companySheetRef.current?.present()}
              className="self-start mt-2 flex-row items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5"
            >
              <Feather name="briefcase" size={13} color="white" />
              <Text className="text-white text-xs font-semibold">
                {selectedCompany?.name || "No company selected"}
              </Text>
              <Feather name="chevron-down" size={13} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open logout confirmation"
          onPress={() => logoutSheetRef.current?.present()}
          className="mb-4 h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/15"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Power color="#ffffff" size={19} strokeWidth={2.5} />
        </Pressable>
      </View>

      <BottomSheetModal
        ref={companySheetRef}
        snapPoints={COMPANY_SHEET_SNAP_POINTS}
        handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 42 }}
        backgroundStyle={{ backgroundColor: "#f8fafc", borderRadius: 28 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.35}
          />
        )}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}
        >
          <Text className="text-slate-400 text-[11px] font-bold tracking-[0.2em] mb-2">
            COMPANIES
          </Text>
          <Text className="text-slate-900 text-2xl font-semibold mb-5">
            Select a company
          </Text>

          {companiesQuery.isLoading ? (
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator size="small" color="#134074" />
              <Text className="text-slate-500 text-sm mt-3">
                Loading companies...
              </Text>
            </View>
          ) : null}

          {companiesQuery.isError ? (
            <View className="px-4 py-6 flex flex-col items-center justify-center gap-2">
              <Text className="text-red-600 font-semibold">
                Could not load companies
              </Text>
              <Pressable className="mt-1 py-1  bg-gray-400 px-3 rounded-xl">
                <Text
                  onPress={() =>  companiesQuery.refetch()}
                  className="text-white text-sm"
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!companiesQuery.isLoading &&
        !companiesQuery.isError &&
        companiesQuery.data?.length === 0 ? (
          <View className="rounded-3xl bg-slate-100 px-4 py-5">
            <Text className="text-slate-700 font-medium">No companies found.</Text>
          </View>
        ) : null}

          {!companiesQuery.isLoading &&
        !companiesQuery.isError &&
        companiesQuery.data?.length ? (
          <View className="gap-3">
            {companiesQuery.data.map((company) => {
              const isSelected = selectedCompany?._id === company._id;

              return (
                <TouchableOpacity
                  key={company._id}
                  activeOpacity={0.9}
                  onPress={() => void handleSelectCompany(company)}
                  className={`rounded-3xl border px-4 py-4 ${
                    isSelected
                      ? "border-[#134074] bg-[#134074]/[0.08]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-slate-900 text-base font-semibold">
                        {company.name}
                      </Text>
                      <Text className="text-slate-500 text-sm mt-1">
                        {[company.place, company.state, company.country]
                          .filter(Boolean)
                          .join(", ") || "Location unavailable"}
                      </Text>
             
                    </View>

                    {isSelected ? (
                      <View className="w-8 h-8 rounded-full bg-[#134074] items-center justify-center">
                        <Feather name="check" size={16} color="white" />
                      </View>
                    ) : (
                      <View className="w-8 h-8 rounded-full border border-slate-200 items-center justify-center">
                        <Feather name="arrow-right" size={14} color="#64748b" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={logoutSheetRef}
        snapPoints={LOGOUT_SHEET_SNAP_POINTS}
        handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 42 }}
        backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 28 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.35}
          />
        )}
      >
        <BottomSheetView className="items-center px-6 pb-8 pt-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
            <LogOut color="#e11d48" size={22} strokeWidth={2.4} />
          </View>
          <Text className="mt-4 text-[20px] font-extrabold text-slate-900">
            Log out?
          </Text>
          <Text className="mt-1.5 text-center text-[13px] leading-5 text-slate-500">
            You&apos;ll need to sign in again to continue.
          </Text>
          <View className="mt-6 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => logoutSheetRef.current?.dismiss()}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white"
            >
              <Text className="text-[14px] font-extrabold text-slate-600">Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm logout"
              disabled={isLoggingOut}
              onPress={() => void handleLogout()}
              className={`min-h-12 flex-1 items-center justify-center rounded-2xl bg-rose-600 ${isLoggingOut ? "opacity-60" : ""}`}
            >
              <Text className="text-[14px] font-extrabold text-white">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
