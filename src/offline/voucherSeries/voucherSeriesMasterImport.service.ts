import { withMasterDownloadGuard, type MasterDownloadGuard } from "@/offline/downloads/masterDownloadGuard.service";
import { withOfflineDatabase } from "@/offline/database/database";
import { downloadVoucherSeriesMaster } from "@/offline/downloads/voucherSeriesMasterDownload.service";

import {
  countOfflineVoucherSeries,
  replaceOfflineVoucherSeries,
  validateOfflineVoucherSeries,
  type OfflineVoucherSeries,
} from "./voucherSeriesMasterRepository";
import {
  readVoucherSeriesMasterDownloadMetadata,
  saveVoucherSeriesMasterDownloadMetadata,
  type VoucherSeriesMasterDownloadMetadata,
} from "./voucherSeriesMasterDownloadMetadata.service";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type VoucherSeriesMasterDownloadStatus = {
  metadata: VoucherSeriesMasterDownloadMetadata | null;
  saleStoredCount: number;
  saleOrderStoredCount: number;
  receiptStoredCount: number;
  isComplete: boolean;
};

/** Downloads and validates all types before their shared SQLite transaction. */
export async function importVoucherSeriesMaster(
  userId: string,
  companyId: string,
  existingGuard?: MasterDownloadGuard,
  onSaving?: () => void,
): Promise<VoucherSeriesMasterDownloadMetadata> {
  if (!isNonEmptyString(userId) || !isNonEmptyString(companyId)) {
    throw new Error("Sign in and select a company before downloading Voucher Series.");
  }

  return withMasterDownloadGuard(userId, companyId, async (guard) => {
    const [saleSeries, saleOrderSeries, receiptSeries] = await Promise.all([
      downloadVoucherSeriesMaster(companyId, "sale"),
      downloadVoucherSeriesMaster(companyId, "saleOrder"),
      downloadVoucherSeriesMaster(companyId, "receipt"),
    ]);
    guard.assertCurrent();
    const series: OfflineVoucherSeries[] = [...saleSeries, ...saleOrderSeries, ...receiptSeries];
    validateOfflineVoucherSeries(companyId, series);
    onSaving?.();
    const metadata: VoucherSeriesMasterDownloadMetadata = {
      companyId,
      saleCount: saleSeries.length,
      saleOrderCount: saleOrderSeries.length,
      receiptCount: receiptSeries.length,
      completedAt: new Date().toISOString(),
    };
    guard.assertCurrent();
    await withOfflineDatabase(userId, (database) => {
      guard.assertCurrent();
      return replaceOfflineVoucherSeries(database, companyId, series, async (transaction) => {
        guard.assertCurrent();
        await saveVoucherSeriesMasterDownloadMetadata(transaction, metadata);
        guard.assertCurrent();
      });
    });
    return metadata;
  }, existingGuard);
}

/** Zero is valid only when its matching type count is recorded in metadata. */
export async function getVoucherSeriesMasterDownloadStatus(
  userId: string,
  companyId: string,
): Promise<VoucherSeriesMasterDownloadStatus> {
  const metadata = await readVoucherSeriesMasterDownloadMetadata(userId, companyId);
  if (!metadata) {
    return {
      metadata: null,
      saleStoredCount: 0,
      saleOrderStoredCount: 0,
      receiptStoredCount: 0,
      isComplete: false,
    };
  }

  const [saleStoredCount, saleOrderStoredCount, receiptStoredCount] = await withOfflineDatabase(
    userId,
    (database) =>
      Promise.all([
        countOfflineVoucherSeries(database, companyId, "sale"),
        countOfflineVoucherSeries(database, companyId, "saleOrder"),
        countOfflineVoucherSeries(database, companyId, "receipt"),
      ]),
  );
  return {
    metadata,
    saleStoredCount,
    saleOrderStoredCount,
    receiptStoredCount,
    isComplete:
      saleStoredCount === metadata.saleCount &&
      saleOrderStoredCount === metadata.saleOrderCount &&
      receiptStoredCount === metadata.receiptCount,
  };
}
