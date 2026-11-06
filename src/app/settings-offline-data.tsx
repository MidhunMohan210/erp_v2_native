import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Building2, CheckCircle2, Clock3, Database, Download, HardDriveDownload, Layers3, ListFilter, Package, ReceiptText, Tags } from "lucide-react-native";
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
  getMasterDownloadErrorMessage,
  type DownloadAllFailure,
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
  receiptCount: number;
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
  completedKeys: DownloadAllMasterKey[];
  failures: DownloadAllFailure[];
  currentKey: DownloadAllMasterKey | null;
  received: number;
  total: number | null;
  error: string | null;
};

const initialDownloadAllState: DownloadAllState = {
  phase: "idle", completedKeys: [], failures: [], currentKey: null, received: 0, total: null, error: null,
};

function IndeterminateProgressBar() {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-[#dce8f3]">
      <Animated.View style={{ opacity, height: 6, width: "33%", borderRadius: 999, backgroundColor: "#134074" }} />
    </View>
  );
}

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
    receiptCount: 0,
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
  const [activeSingleMaster, setActiveSingleMaster] = useState<MasterKey | null>(null);

  useEffect(() => {
    setDownloadAllState(initialDownloadAllState);
    setActiveSingleMaster(null);
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
        receiptCount: 0,
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
      receiptCount: 0,
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
        receiptCount: status.receiptStoredCount,
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
          receiptCount: 0,
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
    if (!userId || !selectedCompany?._id || partyState.isDownloading || isMasterDownloadRunning()) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setActiveSingleMaster("parties");
    setPartyState((current) => ({
      ...current, isLoading: false, isDownloading: true,
      downloadedCount: 0, total: null, isComplete: false,
    }));
    try {
      const metadata = await importPartyMaster(userId, companyId, undefined, undefined, (progress) => {
        if (
          currentPartyContext.current.userId === userId &&
          currentPartyContext.current.companyId === companyId &&
          isCurrentContextGeneration(generation)
        ) {
          setPartyState((current) => ({ ...current, downloadedCount: progress.received, total: progress.total }));
        }
      });
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
      const message = getMasterDownloadErrorMessage(error);
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
      if (isCurrentContextGeneration(generation)) void refreshPartyStatus();
    } finally {
      if (isCurrentContextGeneration(generation)) setActiveSingleMaster((current) => current === "parties" ? null : current);
    }
  };

  const handleProductDownload = async () => {
    if (!userId || !selectedCompany?._id || productState.isDownloading || isMasterDownloadRunning()) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setActiveSingleMaster("products");
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
      const message = getMasterDownloadErrorMessage(error);
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
      if (isCurrentContextGeneration(generation)) void refreshProductStatus();
    } finally {
      if (isCurrentContextGeneration(generation)) setActiveSingleMaster((current) => current === "products" ? null : current);
    }
  };

  const handlePriceLevelDownload = async () => {
    if (!userId || !selectedCompany?._id || priceLevelState.isDownloading || isMasterDownloadRunning()) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setActiveSingleMaster("priceLevels");
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
      const message = getMasterDownloadErrorMessage(error);
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
      if (isCurrentContextGeneration(generation)) void refreshPriceLevelStatus();
    } finally {
      if (isCurrentContextGeneration(generation)) setActiveSingleMaster((current) => current === "priceLevels" ? null : current);
    }
  };

  const handleVoucherSeriesDownload = async () => {
    if (!userId || !selectedCompany?._id || voucherSeriesState.isDownloading || isMasterDownloadRunning()) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setActiveSingleMaster("voucherSeries");
    // The API has no total, so do not show a made-up percentage.
    setVoucherSeriesState({
      isLoading: false,
      isDownloading: true,
      saleCount: 0,
      saleOrderCount: 0,
      receiptCount: 0,
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
        receiptCount: metadata.receiptCount,
        isComplete: true,
      });
      Alert.alert(
        "Voucher Series downloaded",
        `${metadata.saleCount} Sale, ${metadata.saleOrderCount} Sale Order, and ${metadata.receiptCount} Receipt series were saved.`,
      );
    } catch (error) {
      const message = getMasterDownloadErrorMessage(error);
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
      if (isCurrentContextGeneration(generation)) void refreshVoucherSeriesStatus();
    } finally {
      if (isCurrentContextGeneration(generation)) setActiveSingleMaster((current) => current === "voucherSeries" ? null : current);
    }
  };

  const handleAdditionalChargeDownload = async () => {
    if (!userId || !selectedCompany?._id || additionalChargeState.isDownloading || isMasterDownloadRunning()) return;
    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setActiveSingleMaster("additionalCharges");
    // The endpoint has no total, so the UI stays indeterminate until commit.
    setAdditionalChargeState({ isLoading: false, isDownloading: true, count: 0, isComplete: false });
    try {
      const metadata = await importAdditionalChargeMaster(userId, companyId);
      if (currentAdditionalChargeContext.current.userId !== userId || currentAdditionalChargeContext.current.companyId !== companyId || !isCurrentContextGeneration(generation)) return;
      setAdditionalChargeState({ isLoading: false, isDownloading: false, count: metadata.chargeCount, isComplete: true });
      Alert.alert("Additional Charges downloaded", `${metadata.chargeCount} Additional Charges were saved for this company.`);
    } catch (error) {
      const message = getMasterDownloadErrorMessage(error);
      if (currentAdditionalChargeContext.current.userId === userId && currentAdditionalChargeContext.current.companyId === companyId && isCurrentContextGeneration(generation)) {
        setAdditionalChargeState((current) => ({ ...current, isDownloading: false }));
      }
      if (shouldShowDownloadError(error, generation)) {
        Alert.alert("Additional Charge download failed", message);
      }
      if (isCurrentContextGeneration(generation)) void refreshAdditionalChargeStatus();
    } finally {
      if (isCurrentContextGeneration(generation)) setActiveSingleMaster((current) => current === "additionalCharges" ? null : current);
    }
  };

  const handleProductFilterDownload = async () => {
    if (!userId || !selectedCompany?._id || productFilterState.isDownloading || isMasterDownloadRunning()) return;

    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setActiveSingleMaster("productFilters");
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
      const message = getMasterDownloadErrorMessage(error);
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
      if (isCurrentContextGeneration(generation)) void refreshProductFilterStatus();
    } finally {
      if (isCurrentContextGeneration(generation)) setActiveSingleMaster((current) => current === "productFilters" ? null : current);
    }
  };

  const handleDownloadAll = async (retryFailed = false) => {
    if (!userId || !selectedCompany?._id || isAnyDownloadRunning) return;
    const retryKeys = retryFailed ? downloadAllState.failures.map((failure) => failure.key) : undefined;
    if (retryFailed && retryKeys?.length === 0) return;
    const companyId = selectedCompany._id;
    const generation = getCurrentContextGeneration();
    setDownloadAllState((current) => retryFailed
      ? { ...current, phase: "downloading", currentKey: null, error: null }
      : { ...initialDownloadAllState, phase: "downloading" });
    try {
      await downloadAllMasters(userId, companyId, (event) => {
        if (!isCurrentContextGeneration(generation)) return;
        if (event.phase === "completed") {
          setDownloadAllState((current) => ({
            ...current, currentKey: null,
            completedKeys: current.completedKeys.includes(event.key) ? current.completedKeys : [...current.completedKeys, event.key],
            failures: current.failures.filter((failure) => failure.key !== event.key),
          }));
          if (event.key === "parties") void refreshPartyStatus();
          if (event.key === "products") void refreshProductStatus();
          if (event.key === "priceLevels") void refreshPriceLevelStatus();
          if (event.key === "voucherSeries") void refreshVoucherSeriesStatus();
          if (event.key === "additionalCharges") void refreshAdditionalChargeStatus();
          if (event.key === "productFilters") void refreshProductFilterStatus();
        } else if (event.phase === "failed") {
          setDownloadAllState((current) => ({
            ...current, phase: "downloading", currentKey: null,
            failures: [...current.failures.filter((failure) => failure.key !== event.key), event.failure],
          }));
        } else if (event.phase === "partyProgress" || event.phase === "productProgress") {
          setDownloadAllState((current) => ({ ...current, phase: "downloading", currentKey: event.key, received: event.received, total: event.total }));
        } else {
          setDownloadAllState((current) => ({
            ...current, phase: event.phase === "saving" ? "saving" : "downloading", currentKey: event.key,
            received: event.phase === "saving" ? current.received : 0,
            total: event.phase === "saving" ? current.total : null,
          }));
        }
      }, retryKeys);
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
          const master = error instanceof DownloadAllMasterError ? error.master : "Download All";
          const message = error instanceof DownloadAllMasterError
            ? "Local storage could not save this update. Your previously saved data was kept."
            : getMasterDownloadErrorMessage(error);
          setDownloadAllState((current) => ({ ...current, phase: "failed", currentKey: null, error: `${master}: ${message}` }));
        }
        void Promise.allSettled([
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
        <View className="flex-row items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3f8]">
            <Building2 color="#134074" size={21} />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold tracking-[1.5px] text-slate-400">ACTIVE COMPANY</Text>
            <Text className="mt-0.5 text-base font-bold text-slate-900">
              {selectedCompany?.name ?? "No company selected"}
            </Text>
          </View>
        </View>

        <View className="mt-4 rounded-[24px] bg-[#134074] p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[10px] font-bold tracking-[1.5px] text-white/60">OFFLINE LIBRARY</Text>
              <Text className="mt-2 text-lg font-bold text-white">
                {allMastersReady ? "Offline data is ready" : "Offline data is not ready"}
              </Text>
              <Text className="mt-1 text-xs text-white/75">{completedMasters} of {MASTER_ROWS.length} masters saved for this company</Text>
            </View>
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Text className="text-lg font-bold text-white">{completedMasters}/6</Text>
            </View>
          </View>
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <View>
            <Text className="text-base font-semibold text-slate-900">Master data</Text>
            <Text className="mt-0.5 text-sm text-slate-500">Download each category for offline use.</Text>
          </View>
          <HardDriveDownload color="#134074" size={23} />
        </View>

        <View className="mt-3 gap-3">
          {MASTER_ROWS.map((master) => {
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
            const isActiveDownloadAll =
              downloadAllState.currentKey === master.key &&
              (downloadAllState.phase === "downloading" || downloadAllState.phase === "saving");
            const isActive = isActiveDownloadAll || activeSingleMaster === master.key || isDownloading;
            const isWaiting = isAnyDownloadRunning && !isActive;
            const isDoneInRun = isWaiting &&
              (downloadAllState.phase === "downloading" || downloadAllState.phase === "saving") &&
              downloadAllState.completedKeys.includes(master.key);
            const isFailedInRun = isWaiting &&
              (downloadAllState.phase === "downloading" || downloadAllState.phase === "saving") &&
              downloadAllState.failures.some((failure) => failure.key === master.key);
            const recordReceived = isActiveDownloadAll
              ? downloadAllState.received
              : isParty ? partyState.downloadedCount : productState.downloadedCount;
            const recordTotal = isActiveDownloadAll
              ? downloadAllState.total
              : isParty ? partyState.total : productState.total;
            const hasRecordProgress = (isParty || isProduct) && recordTotal !== null && recordTotal > 0;
            const recordProgress = hasRecordProgress ? Math.round((recordReceived / recordTotal) * 100) : 0;
            const savedCount = isProduct
              ? productState.downloadedCount
              : isPriceLevel
                ? priceLevelState.downloadedCount
                : isVoucherSeries
                  ? `${voucherSeriesState.saleCount} Sale · ${voucherSeriesState.saleOrderCount} Sale Order · ${voucherSeriesState.receiptCount} Receipt`
                  : isAdditionalCharge
                    ? additionalChargeState.count
                    : isProductFilter
                      ? productFilterState.count
                      : partyState.downloadedCount;
            const status = isActive
              ? isActiveDownloadAll && downloadAllState.phase === "saving"
                ? "Validating and saving..."
                : hasRecordProgress
                  ? recordReceived === recordTotal
                    ? `Received ${recordReceived} of ${recordTotal}. Finishing...`
                    : `Downloading ${recordReceived} of ${recordTotal}...`
                    : "Downloading..."
              : isLoading
                ? "Checking local data..."
                : isFailedInRun
                  ? "Update failed · saved data kept"
                : isDownloaded
                  ? `${savedCount} saved on this device`
                  : "Ready to download";
            const canDownload = master.isAvailable && !isAnyDownloadRunning && !isLoading;
            const buttonLabel = isActive
              ? isActiveDownloadAll && downloadAllState.phase === "saving" ? "Saving" : "Downloading"
              : isDoneInRun ? "Done" : isFailedInRun ? "Failed" : isWaiting ? "Waiting" : isLoading ? "Checking" : isDownloaded ? "Update" : "Download";
            const MasterIcon = isParty ? Database : isProduct ? Package : isPriceLevel ? Tags : isVoucherSeries ? Layers3 : isAdditionalCharge ? ReceiptText : ListFilter;

            return (
              <View
                key={master.key}
                className={`rounded-[22px] border px-4 py-4 shadow-sm ${isActive ? "border-[#8eb2d5] bg-[#f2f7fc]" : "border-slate-200 bg-white"}`}
              >
                <View className="flex-row items-center gap-3">
                  <View className={`h-11 w-11 items-center justify-center rounded-2xl ${isActive ? "bg-[#dceaf7]" : "bg-[#eef3f8]"}`}>
                    <MasterIcon color="#134074" size={21} strokeWidth={1.9} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[15px] font-bold text-slate-900">{master.title}</Text>
                      {isActive ? <View className="h-1.5 w-1.5 rounded-full bg-[#134074]" /> : isDownloaded ? <CheckCircle2 color="#16803d" size={15} /> : null}
                    </View>
                    <Text className={`mt-1 text-xs ${isActive ? "font-medium text-[#134074]" : "text-slate-500"}`}>{status}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${buttonLabel} ${master.title}`}
                    accessibilityState={{ disabled: !canDownload, busy: isActive }}
                    disabled={!canDownload}
                    onPress={() => {
                      if (isParty) void handlePartyDownload();
                      if (isProduct) void handleProductDownload();
                      if (isPriceLevel) void handlePriceLevelDownload();
                      if (isVoucherSeries) void handleVoucherSeriesDownload();
                      if (isAdditionalCharge) void handleAdditionalChargeDownload();
                      if (isProductFilter) void handleProductFilterDownload();
                    }}
                    className={`min-w-[86px] flex-row items-center justify-center rounded-xl px-3 py-2.5 ${isActive ? "bg-[#134074]" : isDoneInRun ? "bg-emerald-50" : isFailedInRun ? "bg-red-50" : isWaiting || isLoading ? "bg-slate-100" : isDownloaded ? "border border-[#c7d9eb] bg-white" : "bg-[#134074]"}`}
                  >
                    {isActive ? <ActivityIndicator color="#ffffff" size="small" /> : isDoneInRun ? <CheckCircle2 color="#16803d" size={15} /> : isWaiting ? <Clock3 color={isFailedInRun ? "#b91c1c" : "#64748b"} size={14} /> : <Download color={isLoading ? "#94a3b8" : isDownloaded ? "#134074" : "#ffffff"} size={15} />}
                    <Text className={`ml-1.5 text-xs font-bold ${isActive || (!isWaiting && !isLoading && !isDownloaded) ? "text-white" : isDoneInRun ? "text-emerald-700" : isFailedInRun ? "text-red-700" : isDownloaded && !isWaiting ? "text-[#134074]" : "text-slate-500"}`}>
                      {buttonLabel}
                    </Text>
                  </Pressable>
                </View>
                {isActive ? (
                  <View className="mt-4">
                    {hasRecordProgress ? (
                      <View className="h-1.5 overflow-hidden rounded-full bg-[#dce8f3]">
                        <View className="h-full rounded-full bg-[#134074]" style={{ width: `${recordProgress}%` }} />
                      </View>
                    ) : <IndeterminateProgressBar />}
                    <Text className="mt-2 text-right text-[11px] font-medium text-[#54718d]">
                      {hasRecordProgress ? `${recordReceived} of ${recordTotal} received` : isActiveDownloadAll && downloadAllState.phase === "saving" ? "Saving securely" : "In progress"}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download all offline master data"
          disabled={!userId || !selectedCompany?._id || isAnyDownloadRunning}
          onPress={() => void handleDownloadAll(false)}
          className={`mt-5 flex-row items-center justify-center rounded-xl py-4 ${!userId || !selectedCompany?._id || isAnyDownloadRunning ? "bg-slate-200" : "bg-[#134074]"}`}
        >
          <Download color={!userId || !selectedCompany?._id || isAnyDownloadRunning ? "#94a3b8" : "#ffffff"} size={18} />
          <Text className={`ml-2 font-bold ${!userId || !selectedCompany?._id || isAnyDownloadRunning ? "text-slate-400" : "text-white"}`}>
            Download All
          </Text>
        </Pressable>
        {downloadAllState.failures.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Retry ${downloadAllState.failures.length} failed masters`}
            disabled={isAnyDownloadRunning || !userId || !selectedCompany?._id}
            onPress={() => void handleDownloadAll(true)}
            className={`mt-3 items-center rounded-xl border border-[#134074] py-3.5 ${isAnyDownloadRunning ? "opacity-50" : "bg-white"}`}
          >
            <Text className="font-bold text-[#134074]">Retry Failed ({downloadAllState.failures.length})</Text>
          </Pressable>
        ) : null}
        {downloadAllState.phase !== "idle" ? (
          <View className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            <Text className="font-semibold text-slate-900">
              {downloadAllState.completedKeys.length} of 6 masters updated · {downloadAllState.failures.length} failed
            </Text>
            {downloadAllState.error ? (
              <Text className="mt-1 text-sm text-red-700">{downloadAllState.error}</Text>
            ) : downloadAllState.phase === "downloading" || downloadAllState.phase === "saving" ? (
              <Text className="mt-1 text-sm text-slate-600">
                {MASTER_ROWS.find((master) => master.key === downloadAllState.currentKey)?.title ?? "Starting"}: {downloadAllState.phase === "saving" ? "Saving..." : (downloadAllState.currentKey === "parties" || downloadAllState.currentKey === "products") && downloadAllState.total !== null ? `Downloading ${downloadAllState.received} of ${downloadAllState.total}...` : "Downloading..."}
              </Text>
            ) : downloadAllState.failures.length === 0 ? (
              <Text className="mt-1 text-sm text-slate-600">All six masters updated.</Text>
            ) : null}
            {downloadAllState.failures.map((failure) => (
              <View key={failure.key} className="mt-3 rounded-xl bg-red-50 px-3 py-2.5">
                <Text className="text-sm font-semibold text-red-800">{failure.title}</Text>
                <Text className="mt-0.5 text-xs leading-5 text-red-700">{failure.message}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
