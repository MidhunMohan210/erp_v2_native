import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CheckCircle2, Download, HardDriveDownload, RefreshCw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { getSavedParties } from "@/offline/party/partyMasterImport.service";
import { useAppSelector } from "@/store/hooks";

type MasterKey =
  | "parties"
  | "products"
  | "priceLevels"
  | "voucherSeries"
  | "additionalCharges"
  | "productFilters";

type MasterRow = {
  key: MasterKey;
  title: string;
  isAvailable: boolean;
};

const MASTER_ROWS: MasterRow[] = [
  { key: "parties", title: "Parties", isAvailable: true },
  { key: "products", title: "Products", isAvailable: false },
  { key: "priceLevels", title: "Price Levels", isAvailable: false },
  { key: "voucherSeries", title: "Voucher Series", isAvailable: false },
  { key: "additionalCharges", title: "Additional Charges", isAvailable: false },
  { key: "productFilters", title: "Product Filters", isAvailable: false },
];

type PartyDownloadState = {
  isLoading: boolean;
  isDownloading: boolean;
  downloadedCount: number;
};

export default function SettingsOfflineDataScreen() {
  const insets = useSafeAreaInsets();
  const userId = useAppSelector((state) => state.auth.user?._id);
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const currentPartyContext = useRef({ userId, companyId: selectedCompany?._id });
  currentPartyContext.current = { userId, companyId: selectedCompany?._id };
  const [partyState, setPartyState] = useState<PartyDownloadState>({
    isLoading: true,
    isDownloading: false,
    downloadedCount: 0,
  });

  // The Party importer owns its SQLite work. This screen only asks it for the
  // saved rows so the UI always reflects the current selected company.
  const refreshPartyStatus = useCallback(async () => {
    if (!userId || !selectedCompany?._id) {
      setPartyState({ isLoading: false, isDownloading: false, downloadedCount: 0 });
      return;
    }

    const companyId = selectedCompany._id;
    setPartyState({ isLoading: true, isDownloading: false, downloadedCount: 0 });
    try {
      const parties = await getSavedParties(userId, selectedCompany._id);
      if (
        currentPartyContext.current.userId !== userId ||
        currentPartyContext.current.companyId !== companyId
      ) return;
      setPartyState((current) => ({
        ...current,
        isLoading: false,
        downloadedCount: parties.length,
      }));
    } catch {
      // A missing local database is treated as no Party download, not as a
      // reason to expose offline business screens.
      if (
        currentPartyContext.current.userId === userId &&
        currentPartyContext.current.companyId === companyId
      ) {
        setPartyState((current) => ({ ...current, isLoading: false, downloadedCount: 0 }));
      }
    }
  }, [selectedCompany?._id, userId]);

  useFocusEffect(
    useCallback(() => {
      void refreshPartyStatus();
    }, [refreshPartyStatus]),
  );

  const handlePartyDownload = async () => {
    if (!userId || !selectedCompany?._id || partyState.isDownloading) return;

    const companyId = selectedCompany._id;
    setPartyState((current) => ({ ...current, isDownloading: true }));
    try {
      const { importPartyMaster } = await import(
        "@/offline/party/partyMasterImport.service"
      );
      const count = await importPartyMaster(userId, companyId);
      if (
        currentPartyContext.current.userId !== userId ||
        currentPartyContext.current.companyId !== companyId
      ) return;
      setPartyState({ isLoading: false, isDownloading: false, downloadedCount: count });
      Alert.alert("Parties downloaded", `${count} Parties were saved for this company.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        currentPartyContext.current.userId === userId &&
        currentPartyContext.current.companyId === companyId
      ) {
        setPartyState((current) => ({ ...current, isDownloading: false }));
      }
      Alert.alert("Party download failed", message);
    }
  };

  const completedMasters = partyState.downloadedCount > 0 ? 1 : 0;
  const allMastersReady = completedMasters === MASTER_ROWS.length;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Offline Data" />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-slate-200 bg-white p-5">
          <Text className="text-xs font-bold tracking-wide text-slate-400">SELECTED COMPANY</Text>
          <Text className="mt-1 text-lg font-semibold text-slate-900">
            {selectedCompany?.name ?? "No company selected"}
          </Text>
        </View>

        <View className="mt-4 rounded-2xl bg-[#134074] p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-semibold text-white">
                {allMastersReady ? "Offline data is ready" : "Offline data is not ready"}
              </Text>
              <Text className="mt-1 text-sm text-white/80">
                {completedMasters} of {MASTER_ROWS.length} required master categories downloaded
              </Text>
            </View>
            <CheckCircle2 color={allMastersReady ? "#bbf7d0" : "#cbd5e1"} size={30} />
          </View>
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <View>
            <Text className="text-base font-semibold text-slate-900">Master data</Text>
            <Text className="mt-0.5 text-sm text-slate-500">Download each category for offline use.</Text>
          </View>
          <HardDriveDownload color="#134074" size={23} />
        </View>

        <View className="mt-3 rounded-2xl border border-slate-200 bg-white px-4">
          {MASTER_ROWS.map((master, index) => {
            const isParty = master.key === "parties";
            const isDownloaded = isParty && partyState.downloadedCount > 0;
            const isDownloading = isParty && partyState.isDownloading;
            const progress = isDownloaded ? 100 : 0;
            const status = partyState.isLoading && isParty
              ? "Checking local data..."
              : isDownloading
                ? "Downloading..."
                : isDownloaded
                  ? `${partyState.downloadedCount} saved`
                  : "Not downloaded";

            return (
              <View
                key={master.key}
                className={index === MASTER_ROWS.length - 1 ? "py-4" : "border-b border-slate-100 py-4"}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-medium text-slate-900">{master.title}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{status}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${isDownloaded ? "Update" : "Download"} ${master.title}`}
                    disabled={!master.isAvailable || isDownloading || partyState.isLoading}
                    onPress={() => void handlePartyDownload()}
                    className={`min-w-24 flex-row items-center justify-center rounded-lg px-3 py-2 ${master.isAvailable && !isDownloading && !partyState.isLoading ? "bg-[#134074]" : "bg-slate-100"}`}
                  >
                    {isDownloading ? <RefreshCw color="#ffffff" size={15} /> : <Download color={master.isAvailable ? "#ffffff" : "#94a3b8"} size={15} />}
                    <Text className={`ml-1.5 text-xs font-bold ${master.isAvailable && !isDownloading && !partyState.isLoading ? "text-white" : "text-slate-400"}`}>
                      {isDownloaded ? "Update" : "Download"}
                    </Text>
                  </Pressable>
                </View>
                <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <View className="h-full rounded-full bg-[#134074]" style={{ width: `${progress}%` }} />
                </View>
                <Text className="mt-1 text-right text-xs font-medium text-slate-400">{progress}%</Text>
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download all offline master data"
          disabled
          className="mt-5 flex-row items-center justify-center rounded-xl bg-slate-200 py-4"
        >
          <Download color="#94a3b8" size={18} />
          <Text className="ml-2 font-bold text-slate-400">Download All</Text>
        </Pressable>
        <Text className="mt-2 text-center text-xs leading-5 text-slate-500">
          Download All will be available when every required master download is implemented.
        </Text>
      </ScrollView>
    </View>
  );
}
