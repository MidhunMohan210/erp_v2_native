import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CheckCircle2, Download, HardDriveDownload, RefreshCw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import {
  getPartyMasterDownloadStatus,
  importPartyMaster,
} from "@/offline/party/partyMasterImport.service";
import {
  getProductMasterDownloadStatus,
  importProductMaster,
} from "@/offline/product/productMasterImport.service";
import {
  getPriceLevelMasterDownloadStatus,
  importPriceLevelMaster,
} from "@/offline/priceLevel/priceLevelMasterImport.service";
import {
  getVoucherSeriesMasterDownloadStatus,
  importVoucherSeriesMaster,
} from "@/offline/voucherSeries/voucherSeriesMasterImport.service";
import {
  getAdditionalChargeMasterDownloadStatus,
  importAdditionalChargeMaster,
} from "@/offline/additionalCharge/additionalChargeMasterImport.service";
import {
  getProductFilterMasterStatus,
  importProductFilterMaster,
} from "@/offline/productFilter/productFilterMasterImport.service";
import { useAppSelector } from "@/store/hooks";
import {
  isMasterDownloadRunning,
  MasterDownloadBusyError,
  MasterDownloadCancelledError,
  subscribeToMasterDownload,
} from "@/offline/downloads/masterDownloadGuard.service";
import {
  downloadAllMasters,
  DownloadAllMasterError,
  type DownloadAllMasterKey,
} from "@/offline/downloads/downloadAllMasters.service";
import { getCurrentContextGeneration, isCurrentContextGeneration } from "@/services/authSessionGeneration";

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
  { key: "products", title: "Products", isAvailable: true },
  { key: "priceLevels", title: "Price Levels", isAvailable: true },
  { key: "voucherSeries", title: "Voucher Series", isAvailable: true },
  { key: "additionalCharges", title: "Additional Charges", isAvailable: true },
  { key: "productFilters", title: "Product Filters", isAvailable: true },
];

type PartyDownloadState = {
  isLoading: boolean;
  isDownloading: boolean;
  downloadedCount: number;
  total: number | null;
  isComplete: boolean;
};

type ProductDownloadState = {
  isLoading: boolean;
  isDownloading: boolean;
  downloadedCount: number;
  total: number | null;
  isComplete: boolean;
};

type PriceLevelDownloadState = {
  isLoading: boolean;
  isDownloading: boolean;
  downloadedCount: number;
  isComplete: boolean;
};

type VoucherSeriesDownloadState = {
  isLoading: boolean;
  isDownloading: boolean;
  saleCount: number;
  saleOrderCount: number;
  isComplete: boolean;
};
type AdditionalChargeDownloadState = {
  isLoading: boolean;
  isDownloading: boolean;
  count: number;
  isComplete: boolean;
};

type ProductFilterDownloadState = {
  isLoading: boolean;
  isDownloading: boolean;
  count: number;
  isComplete: boolean;
};

type DownloadAllState = {
  phase: "idle" | "downloading" | "saving" | "failed" | "complete";
  completed: number;
  currentKey: DownloadAllMasterKey | null;
  received: number;
  total: number | null;
  error: string | null;
};

const initialDownloadAllState: DownloadAllState = {
  phase: "idle", completed: 0, currentKey: null, received: 0, total: null, error: null,
};

function shouldShowDownloadError(error: unknown, generation: number): boolean {
  return (
    !(error instanceof MasterDownloadBusyError) &&
    !(error instanceof MasterDownloadCancelledError) &&
    isCurrentContextGeneration(generation)
  );
}

export default function SettingsOfflineDataScreen() {
  const insets = useSafeAreaInsets();
  const isAnyDownloadRunning = useSyncExternalStore(subscribeToMasterDownload, isMasterDownloadRunning);
  const userId = useAppSelector((state) => state.auth.user?._id);
  const selectedCompany = useAppSelector((state) => state.company.selectedCompany);
  const currentPartyContext = useRef({ userId, companyId: selectedCompany?._id });
  const currentProductContext = useRef({ userId, companyId: selectedCompany?._id });
  const currentPriceLevelContext = useRef({ userId, companyId: selectedCompany?._id });
  const currentVoucherSeriesContext = useRef({ userId, companyId: selectedCompany?._id });
  const currentAdditionalChargeContext = useRef({ userId, companyId: selectedCompany?._id });
  const currentProductFilterContext = useRef({ userId, companyId: selectedCompany?._id });
  currentPartyContext.current = { userId, companyId: selectedCompany?._id };
  currentProductContext.current = { userId, companyId: selectedCompany?._id };
  currentPriceLevelContext.current = { userId, companyId: selectedCompany?._id };
  currentVoucherSeriesContext.current = { userId, companyId: selectedCompany?._id };
  currentAdditionalChargeContext.current = { userId, companyId: selectedCompany?._id };
  currentProductFilterContext.current = { userId, companyId: selectedCompany?._id };
  const [partyState, setPartyState] = useState<PartyDownloadState>({
    isLoading: true,
    isDownloading: false,
    downloadedCount: 0,
    total: null,
    isComplete: false,
  });
  const [productState, setProductState] = useState<ProductDownloadState>({
    isLoading: true,
    isDownloading: false,
    downloadedCount: 0,
    total: null,
    isComplete: false,
  });
  const [priceLevelState, setPriceLevelState] = useState<PriceLevelDownloadState>({
    isLoading: true,
    isDownloading: false,
    downloadedCount: 0,
    isComplete: false,
  });
  const [voucherSeriesState, setVoucherSeriesState] = useState<VoucherSeriesDownloadState>({
    isLoading: true,
    isDownloading: false,
    saleCount: 0,
    saleOrderCount: 0,
    isComplete: false,
  });
  const [additionalChargeState, setAdditionalChargeState] =
    useState<AdditionalChargeDownloadState>({
      isLoading: true,
      isDownloading: false,
      count: 0,
      isComplete: false,
    });
  const [productFilterState, setProductFilterState] =
    useState<ProductFilterDownloadState>({
      isLoading: true,
      isDownloading: false,
      count: 0,
      isComplete: false,
    });
  const [downloadAllState, setDownloadAllState] = useState<DownloadAllState>(initialDownloadAllState);

  useEffect(() => {
    setDownloadAllState(initialDownloadAllState);
  }, [userId, selectedCompany?._id]);

  // Party is ready only after its saved receipt matches the local server snapshot.
  const refreshPartyStatus = useCallback(async () => {
    if (!userId || !selectedCompany?._id) {
      setPartyState({
        isLoading: false,
        isDownloading: false,
        downloadedCount: 0,
        total: null,
        isComplete: false,
      });
      return;
    }

    const companyId = selectedCompany._id;
    setPartyState({
      isLoading: true,
      isDownloading: false,
      downloadedCount: 0,
      total: null,
      isComplete: false,
    });
    try {
      const status = await getPartyMasterDownloadStatus(userId, companyId);
      if (
        currentPartyContext.current.userId !== userId ||
        currentPartyContext.current.companyId !== companyId
      ) return;
      setPartyState((current) => ({
        ...current,
        isLoading: false,
        downloadedCount: status.storedCount,
        total: status.metadata?.partyCount ?? null,
        isComplete: status.isComplete,
      }));
    } catch {
      // A missing local database is treated as no Party download, not as a
      // reason to expose offline business screens.
      if (
        currentPartyContext.current.userId === userId &&
        currentPartyContext.current.companyId === companyId
      ) {
        setPartyState((current) => ({
          ...current,
          isLoading: false,
          downloadedCount: 0,
          total: null,
          isComplete: false,
        }));
      }
    }
  }, [selectedCompany?._id, userId]);

  const refreshProductFilterStatus = useCallback(async () => {
    if (!userId || !selectedCompany?._id) {
      setProductFilterState({
        isLoading: false,
        isDownloading: false,
        count: 0,
        isComplete: false,
      });
      return;
    }

    const companyId = selectedCompany._id;
    setProductFilterState({
      isLoading: true,
      isDownloading: false,
      count: 0,
      isComplete: false,
    });
    try {
      const status = await getProductFilterMasterStatus(userId, companyId);
      if (
        currentProductFilterContext.current.userId !== userId ||
        currentProductFilterContext.current.companyId !== companyId
      ) {
        return;
      }

      const count =
        status.counts.brand +
        status.counts.category +
        status.counts.subcategory;
      setProductFilterState({
        isLoading: false,
        isDownloading: false,
        count,
        isComplete: status.isComplete,
      });
    } catch {
      if (
        currentProductFilterContext.current.userId === userId &&
        currentProductFilterContext.current.companyId === companyId
      ) {
        setProductFilterState({
          isLoading: false,
          isDownloading: false,
          count: 0,
          isComplete: false,
        });
      }
    }
  }, [selectedCompany?._id, userId]);

  const refreshAdditionalChargeStatus = useCallback(async () => {
    if (!userId || !selectedCompany?._id) {
      setAdditionalChargeState({ isLoading: false, isDownloading: false, count: 0, isComplete: false });
      return;
    }
    const companyId = selectedCompany._id;
    setAdditionalChargeState({ isLoading: true, isDownloading: false, count: 0, isComplete: false });
    try {
      const status = await getAdditionalChargeMasterDownloadStatus(userId, companyId);
      if (currentAdditionalChargeContext.current.userId !== userId || currentAdditionalChargeContext.current.companyId !== companyId) return;
      setAdditionalChargeState({ isLoading: false, isDownloading: false, count: status.storedCount, isComplete: status.isComplete });
    } catch {
      if (currentAdditionalChargeContext.current.userId === userId && currentAdditionalChargeContext.current.companyId === companyId) {
        setAdditionalChargeState({ isLoading: false, isDownloading: false, count: 0, isComplete: false });
      }
    }
  }, [selectedCompany?._id, userId]);

  const refreshProductStatus = useCallback(async () => {
    if (!userId || !selectedCompany?._id) {
      setProductState({
        isLoading: false,
        isDownloading: false,
        downloadedCount: 0,
        total: null,
        isComplete: false,
      });
      return;
    }

    const companyId = selectedCompany._id;
    setProductState({
      isLoading: true,
      isDownloading: false,
      downloadedCount: 0,
      total: null,
      isComplete: false,
    });
    try {
      const status = await getProductMasterDownloadStatus(userId, companyId);
      if (
        currentProductContext.current.userId !== userId ||
        currentProductContext.current.companyId !== companyId
      ) return;
      setProductState({
        isLoading: false,
        isDownloading: false,
        downloadedCount: status.storedCount,
        total: status.metadata?.productCount ?? null,
        isComplete: status.isComplete,
      });
    } catch {
      if (
        currentProductContext.current.userId === userId &&
        currentProductContext.current.companyId === companyId
      ) {
        setProductState({
          isLoading: false,
          isDownloading: false,
          downloadedCount: 0,
          total: null,
          isComplete: false,
        });
      }
    }
  }, [selectedCompany?._id, userId]);

  const refreshPriceLevelStatus = useCallback(async () => {
    if (!userId || !selectedCompany?._id) {
      setPriceLevelState({
        isLoading: false,
        isDownloading: false,
        downloadedCount: 0,
        isComplete: false,
      });
      return;
    }

    const companyId = selectedCompany._id;
    setPriceLevelState({
      isLoading: true,
      isDownloading: false,
      downloadedCount: 0,
      isComplete: false,
    });
    try {
      const status = await getPriceLevelMasterDownloadStatus(userId, companyId);
      if (
        currentPriceLevelContext.current.userId !== userId ||
        currentPriceLevelContext.current.companyId !== companyId
      ) return;
      setPriceLevelState({
        isLoading: false,
        isDownloading: false,
        downloadedCount: status.storedCount,
        isComplete: status.isComplete,
      });
    } catch {
      if (
        currentPriceLevelContext.current.userId === userId &&
        currentPriceLevelContext.current.companyId === companyId
      ) {
        setPriceLevelState({
          isLoading: false,
          isDownloading: false,
          downloadedCount: 0,
          isComplete: false,
        });
      }
    }
  }, [selectedCompany?._id, userId]);

  const refreshVoucherSeriesStatus = useCallback(async () => {
    if (!userId || !selectedCompany?._id) {
      setVoucherSeriesState({
        isLoading: false,
        isDownloading: false,
        saleCount: 0,
        saleOrderCount: 0,
        isComplete: false,
      });
      return;
    }

    const companyId = selectedCompany._id;
    setVoucherSeriesState({
      isLoading: true,
      isDownloading: false,
      saleCount: 0,
      saleOrderCount: 0,
      isComplete: false,
    });
    try {
      const status = await getVoucherSeriesMasterDownloadStatus(userId, companyId);
      if (
        currentVoucherSeriesContext.current.userId !== userId ||
        currentVoucherSeriesContext.current.companyId !== companyId
      ) return;
      setVoucherSeriesState({
        isLoading: false,
        isDownloading: false,
        saleCount: status.saleStoredCount,
        saleOrderCount: status.saleOrderStoredCount,
        isComplete: status.isComplete,
      });
    } catch {
      if (
        currentVoucherSeriesContext.current.userId === userId &&
        currentVoucherSeriesContext.current.companyId === companyId
      ) {
        setVoucherSeriesState({
          isLoading: false,
          isDownloading: false,
          saleCount: 0,
          saleOrderCount: 0,
          isComplete: false,
        });
      }
    }
  }, [selectedCompany?._id, userId]);

  useFocusEffect(
    useCallback(() => {
      void refreshPartyStatus();
      void refreshProductStatus();
      void refreshPriceLevelStatus();
      void refreshVoucherSeriesStatus();
      void refreshAdditionalChargeStatus();
      void refreshProductFilterStatus();
    }, [
      refreshPartyStatus,
      refreshPriceLevelStatus,
      refreshProductStatus,
      refreshVoucherSeriesStatus,
      refreshAdditionalChargeStatus,
      refreshProductFilterStatus,
    ]),
  );

  const handlePartyDownload = async () => {
    if (!userId || !selectedCompany?._id || partyState.isDownloading) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setPartyState((current) => ({ ...current, isDownloading: true }));
    try {
      const metadata = await importPartyMaster(userId, companyId);
      if (
        currentPartyContext.current.userId !== userId ||
        currentPartyContext.current.companyId !== companyId ||
        !isCurrentContextGeneration(generation)
      ) return;
      setPartyState({
        isLoading: false,
        isDownloading: false,
        downloadedCount: metadata.partyCount,
        total: metadata.partyCount,
        isComplete: true,
      });
      Alert.alert("Parties downloaded", `${metadata.partyCount} Parties were saved for this company.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        currentPartyContext.current.userId === userId &&
        currentPartyContext.current.companyId === companyId &&
        isCurrentContextGeneration(generation)
      ) {
        setPartyState((current) => ({ ...current, isDownloading: false }));
      }
      if (shouldShowDownloadError(error, generation)) {
        Alert.alert("Party download failed", message);
      }
    }
  };

  const handleProductDownload = async () => {
    if (!userId || !selectedCompany?._id || productState.isDownloading) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setProductState((current) => ({
      ...current,
      isLoading: false,
      isDownloading: true,
      downloadedCount: 0,
      total: null,
      isComplete: false,
    }));
    try {
      const metadata = await importProductMaster(userId, companyId, (progress) => {
        if (
          currentProductContext.current.userId === userId &&
          currentProductContext.current.companyId === companyId &&
          isCurrentContextGeneration(generation)
        ) {
          setProductState({
            isLoading: false,
            isDownloading: true,
            downloadedCount: progress.received,
            total: progress.total,
            isComplete: false,
          });
        }
      });
      if (
        currentProductContext.current.userId !== userId ||
        currentProductContext.current.companyId !== companyId ||
        !isCurrentContextGeneration(generation)
      ) return;
      setProductState({
        isLoading: false,
        isDownloading: false,
        downloadedCount: metadata.productCount,
        total: metadata.productCount,
        isComplete: true,
      });
      Alert.alert("Products downloaded", `${metadata.productCount} Products were saved for this company.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        currentProductContext.current.userId === userId &&
        currentProductContext.current.companyId === companyId &&
        isCurrentContextGeneration(generation)
      ) {
        setProductState((current) => ({ ...current, isDownloading: false }));
      }
      if (shouldShowDownloadError(error, generation)) {
        Alert.alert("Product download failed", message);
      }
    }
  };

  const handlePriceLevelDownload = async () => {
    if (!userId || !selectedCompany?._id || priceLevelState.isDownloading) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    // The API has no total, so only show its indeterminate downloading state.
    setPriceLevelState({
      isLoading: false,
      isDownloading: true,
      downloadedCount: 0,
      isComplete: false,
    });
    try {
      const metadata = await importPriceLevelMaster(userId, companyId);
      if (
        currentPriceLevelContext.current.userId !== userId ||
        currentPriceLevelContext.current.companyId !== companyId ||
        !isCurrentContextGeneration(generation)
      ) return;
      setPriceLevelState({
        isLoading: false,
        isDownloading: false,
        downloadedCount: metadata.priceLevelCount,
        isComplete: true,
      });
      Alert.alert(
        "Price Levels downloaded",
        `${metadata.priceLevelCount} Price Levels were saved for this company.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        currentPriceLevelContext.current.userId === userId &&
        currentPriceLevelContext.current.companyId === companyId &&
        isCurrentContextGeneration(generation)
      ) {
        setPriceLevelState((current) => ({ ...current, isDownloading: false }));
      }
      if (shouldShowDownloadError(error, generation)) {
        Alert.alert("Price Level download failed", message);
      }
    }
  };

  const handleVoucherSeriesDownload = async () => {
    if (!userId || !selectedCompany?._id || voucherSeriesState.isDownloading) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    // The API has no total, so do not show a made-up percentage.
    setVoucherSeriesState({
      isLoading: false,
      isDownloading: true,
      saleCount: 0,
      saleOrderCount: 0,
      isComplete: false,
    });
    try {
      const metadata = await importVoucherSeriesMaster(userId, companyId);
      if (
        currentVoucherSeriesContext.current.userId !== userId ||
        currentVoucherSeriesContext.current.companyId !== companyId ||
        !isCurrentContextGeneration(generation)
      ) return;
      setVoucherSeriesState({
        isLoading: false,
        isDownloading: false,
        saleCount: metadata.saleCount,
        saleOrderCount: metadata.saleOrderCount,
        isComplete: true,
      });
      Alert.alert(
        "Voucher Series downloaded",
        `${metadata.saleCount} Sale and ${metadata.saleOrderCount} Sale Order series were saved.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        currentVoucherSeriesContext.current.userId === userId &&
        currentVoucherSeriesContext.current.companyId === companyId &&
        isCurrentContextGeneration(generation)
      ) {
        setVoucherSeriesState((current) => ({ ...current, isDownloading: false }));
      }
      if (shouldShowDownloadError(error, generation)) {
        Alert.alert("Voucher Series download failed", message);
      }
    }
  };

  const handleAdditionalChargeDownload = async () => {
    if (!userId || !selectedCompany?._id || additionalChargeState.isDownloading) return;
    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    // The endpoint has no total, so the UI stays indeterminate until commit.
    setAdditionalChargeState({ isLoading: false, isDownloading: true, count: 0, isComplete: false });
    try {
      const metadata = await importAdditionalChargeMaster(userId, companyId);
      if (currentAdditionalChargeContext.current.userId !== userId || currentAdditionalChargeContext.current.companyId !== companyId || !isCurrentContextGeneration(generation)) return;
      setAdditionalChargeState({ isLoading: false, isDownloading: false, count: metadata.chargeCount, isComplete: true });
      Alert.alert("Additional Charges downloaded", `${metadata.chargeCount} Additional Charges were saved for this company.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (currentAdditionalChargeContext.current.userId === userId && currentAdditionalChargeContext.current.companyId === companyId && isCurrentContextGeneration(generation)) {
        setAdditionalChargeState((current) => ({ ...current, isDownloading: false }));
      }
      if (shouldShowDownloadError(error, generation)) {
        Alert.alert("Additional Charge download failed", message);
      }
    }
  };

  const handleProductFilterDownload = async () => {
    if (!userId || !selectedCompany?._id || productFilterState.isDownloading) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    // The filter APIs provide no total, so completion is shown only after SQLite commits.
    setProductFilterState({
      isLoading: false,
      isDownloading: true,
      count: 0,
      isComplete: false,
    });
    try {
      const metadata = await importProductFilterMaster(userId, companyId);
      if (
        currentProductFilterContext.current.userId !== userId ||
        currentProductFilterContext.current.companyId !== companyId ||
        !isCurrentContextGeneration(generation)
      ) {
        return;
      }

      const count =
        metadata.brandCount +
        metadata.categoryCount +
        metadata.subcategoryCount;
      setProductFilterState({
        isLoading: false,
        isDownloading: false,
        count,
        isComplete: true,
      });
      Alert.alert(
        "Product Filters downloaded",
        `${count} Product Filters were saved for this company.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        currentProductFilterContext.current.userId === userId &&
        currentProductFilterContext.current.companyId === companyId &&
        isCurrentContextGeneration(generation)
      ) {
        setProductFilterState((current) => ({
          ...current,
          isDownloading: false,
        }));
      }
      if (shouldShowDownloadError(error, generation)) {
        Alert.alert("Product Filter download failed", message);
      }
    }
  };

  const handleDownloadAll = async () => {
    if (!userId || !selectedCompany?._id || isAnyDownloadRunning) return;
    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setDownloadAllState({ ...initialDownloadAllState, phase: "downloading" });
    try {
      await downloadAllMasters(userId, companyId, (event) => {
        if (!isCurrentContextGeneration(generation)) return;
        if (event.phase === "completed") {
          setDownloadAllState((current) => ({ ...current, completed: event.completed, currentKey: null }));
          if (event.key === "parties") void refreshPartyStatus();
          if (event.key === "products") void refreshProductStatus();
          if (event.key === "priceLevels") void refreshPriceLevelStatus();
          if (event.key === "voucherSeries") void refreshVoucherSeriesStatus();
          if (event.key === "additionalCharges") void refreshAdditionalChargeStatus();
          if (event.key === "productFilters") void refreshProductFilterStatus();
        } else if (event.phase === "productProgress") {
          setDownloadAllState((current) => ({ ...current, phase: "downloading", currentKey: "products", received: event.received, total: event.total }));
        } else {
          setDownloadAllState((current) => ({
            ...current, phase: event.phase === "saving" ? "saving" : "downloading", currentKey: event.key,
            received: 0, total: null,
          }));
        }
      });
      if (isCurrentContextGeneration(generation)) {
        setDownloadAllState((current) => ({ ...current, phase: "complete", currentKey: null }));
      }
    } catch (error) {
      if (error instanceof MasterDownloadBusyError) {
        if (isCurrentContextGeneration(generation)) setDownloadAllState(initialDownloadAllState);
        return;
      }
      if (isCurrentContextGeneration(generation)) {
        if (error instanceof MasterDownloadCancelledError) {
          setDownloadAllState(initialDownloadAllState);
        } else {
          const message = error instanceof Error ? error.message : String(error);
          const master = error instanceof DownloadAllMasterError ? error.master : "Download All";
          setDownloadAllState((current) => ({ ...current, phase: "failed", currentKey: null, error: `${master}: ${message}` }));
        }
        void Promise.all([
          refreshPartyStatus(), refreshProductStatus(), refreshPriceLevelStatus(),
          refreshVoucherSeriesStatus(), refreshAdditionalChargeStatus(), refreshProductFilterStatus(),
        ]);
      }
    }
  };

  const completedMasters =
    (partyState.isComplete ? 1 : 0) +
    (productState.isComplete ? 1 : 0) +
    (priceLevelState.isComplete ? 1 : 0) +
    (voucherSeriesState.isComplete ? 1 : 0) +
    (additionalChargeState.isComplete ? 1 : 0) +
    (productFilterState.isComplete ? 1 : 0);
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
            const isProduct = master.key === "products";
            const isPriceLevel = master.key === "priceLevels";
            const isVoucherSeries = master.key === "voucherSeries";
            const isAdditionalCharge = master.key === "additionalCharges";
            const isProductFilter = master.key === "productFilters";
            const isDownloaded = isParty
              ? partyState.isComplete
              : isProduct
                ? productState.isComplete
                : isPriceLevel
                  ? priceLevelState.isComplete
                  : isVoucherSeries ? voucherSeriesState.isComplete : isAdditionalCharge ? additionalChargeState.isComplete : isProductFilter && productFilterState.isComplete;
            const isDownloading = isParty
              ? partyState.isDownloading
              : isProduct
                ? productState.isDownloading
                : isPriceLevel
                  ? priceLevelState.isDownloading
                  : isVoucherSeries ? voucherSeriesState.isDownloading : isAdditionalCharge ? additionalChargeState.isDownloading : isProductFilter && productFilterState.isDownloading;
            const isLoading = isParty
              ? partyState.isLoading
              : isProduct
                ? productState.isLoading
                : isPriceLevel
                  ? priceLevelState.isLoading
                  : isVoucherSeries ? voucherSeriesState.isLoading : isAdditionalCharge ? additionalChargeState.isLoading : isProductFilter && productFilterState.isLoading;
            const progress = isParty
              ? partyState.isComplete
                ? 100
                : 0
              : isProduct
                ? productState.isComplete
                  ? 100
                  : productState.total && productState.total > 0
                    ? Math.round((productState.downloadedCount / productState.total) * 100)
                    : 0
                : isPriceLevel
                  ? priceLevelState.isComplete ? 100 : 0
                  : isVoucherSeries
                    ? voucherSeriesState.isComplete ? 100 : 0
                    : isAdditionalCharge ? additionalChargeState.isComplete ? 100 : 0 : isProductFilter ? productFilterState.isComplete ? 100 : 0 : isDownloaded ? 100 : 0;
            const isActiveDownloadAll =
              downloadAllState.currentKey === master.key &&
              (downloadAllState.phase === "downloading" || downloadAllState.phase === "saving");
            const status = isActiveDownloadAll
              ? downloadAllState.phase === "saving"
                ? "Validating and saving..."
                : isProduct && downloadAllState.total !== null
                  ? `Downloading ${downloadAllState.received} of ${downloadAllState.total}...`
                  : "Downloading..."
              : isLoading
              ? "Checking local data..."
              : isDownloading
                ? isProduct && productState.total !== null
                  ? `Downloading ${productState.downloadedCount} of ${productState.total}...`
                  : "Downloading..."
                : isDownloaded
                  ? `${isProduct
                    ? productState.downloadedCount
                    : isPriceLevel
                      ? priceLevelState.downloadedCount
                      : isVoucherSeries
                        ? `${voucherSeriesState.saleCount} Sale, ${voucherSeriesState.saleOrderCount} Sale Order`
                        : isAdditionalCharge ? additionalChargeState.count : isProductFilter ? productFilterState.count : partyState.downloadedCount} saved`
                  : "Not downloaded";
            const canDownload = master.isAvailable && !isAnyDownloadRunning && !isDownloading && !isLoading;
            const showProgress =
              (!isPriceLevel || priceLevelState.isComplete) &&
              (!isVoucherSeries || voucherSeriesState.isComplete) &&
              (!isAdditionalCharge || additionalChargeState.isComplete) && (!isProductFilter || productFilterState.isComplete);

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
                    disabled={!canDownload}
                    onPress={() => {
                      if (isParty) void handlePartyDownload();
                      if (isProduct) void handleProductDownload();
                      if (isPriceLevel) void handlePriceLevelDownload();
                      if (isVoucherSeries) void handleVoucherSeriesDownload();
                      if (isAdditionalCharge) void handleAdditionalChargeDownload();
                      if (isProductFilter) void handleProductFilterDownload();
                    }}
                    className={`min-w-24 flex-row items-center justify-center rounded-lg px-3 py-2 ${canDownload ? "bg-[#134074]" : "bg-slate-100"}`}
                  >
                    {isDownloading ? <RefreshCw color="#ffffff" size={15} /> : <Download color={canDownload ? "#ffffff" : "#94a3b8"} size={15} />}
                    <Text className={`ml-1.5 text-xs font-bold ${canDownload ? "text-white" : "text-slate-400"}`}>
                      {isDownloaded ? "Update" : "Download"}
                    </Text>
                  </Pressable>
                </View>
                {showProgress && !isActiveDownloadAll ? (
                  <>
                    <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <View className="h-full rounded-full bg-[#134074]" style={{ width: `${progress}%` }} />
                    </View>
                    <Text className="mt-1 text-right text-xs font-medium text-slate-400">{progress}%</Text>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download all offline master data"
          disabled={!userId || !selectedCompany?._id || isAnyDownloadRunning}
          onPress={() => void handleDownloadAll()}
          className={`mt-5 flex-row items-center justify-center rounded-xl py-4 ${!userId || !selectedCompany?._id || isAnyDownloadRunning ? "bg-slate-200" : "bg-[#134074]"}`}
        >
          <Download color={!userId || !selectedCompany?._id || isAnyDownloadRunning ? "#94a3b8" : "#ffffff"} size={18} />
          <Text className={`ml-2 font-bold ${!userId || !selectedCompany?._id || isAnyDownloadRunning ? "text-slate-400" : "text-white"}`}>
            {downloadAllState.phase === "failed" ? "Retry Download All" : "Download All"}
          </Text>
        </Pressable>
        {downloadAllState.phase !== "idle" ? (
          <View className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            <Text className="font-semibold text-slate-900">{downloadAllState.completed} of 6 completed</Text>
            {downloadAllState.phase === "failed" ? (
              <Text className="mt-1 text-sm text-red-700">{downloadAllState.error}</Text>
            ) : downloadAllState.phase === "complete" ? (
              <Text className="mt-1 text-sm text-slate-600">All six masters saved.</Text>
            ) : (
              <Text className="mt-1 text-sm text-slate-600">
                {MASTER_ROWS.find((master) => master.key === downloadAllState.currentKey)?.title ?? "Starting"}: {downloadAllState.phase === "saving" ? "Validating and saving..." : downloadAllState.currentKey === "products" && downloadAllState.total !== null ? `Downloading ${downloadAllState.received} of ${downloadAllState.total}...` : "Downloading..."}
              </Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
