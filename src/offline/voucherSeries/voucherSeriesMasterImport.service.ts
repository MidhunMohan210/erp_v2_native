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
  isComplete: boolean;
};

/** Downloads and validates both types before their shared SQLite transaction. */
export async function importVoucherSeriesMaster(
  userId: string,
  companyId: string,
): Promise<VoucherSeriesMasterDownloadMetadata> {
  if (!isNonEmptyString(userId) || !isNonEmptyString(companyId)) {
    throw new Error("Sign in and select a company before downloading Voucher Series.");
  }

  const [saleSeries, saleOrderSeries] = await Promise.all([
    downloadVoucherSeriesMaster(companyId, "sale"),
    downloadVoucherSeriesMaster(companyId, "saleOrder"),
  ]);
  const series: OfflineVoucherSeries[] = [...saleSeries, ...saleOrderSeries];
  validateOfflineVoucherSeries(companyId, series);
  await withOfflineDatabase(userId, (database) =>
    replaceOfflineVoucherSeries(database, companyId, series),
  );

  const metadata: VoucherSeriesMasterDownloadMetadata = {
    companyId,
    saleCount: saleSeries.length,
    saleOrderCount: saleOrderSeries.length,
    completedAt: new Date().toISOString(),
  };
  await saveVoucherSeriesMasterDownloadMetadata(userId, metadata);
  return metadata;
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
      isComplete: false,
    };
  }

  const [saleStoredCount, saleOrderStoredCount] = await withOfflineDatabase(
    userId,
    (database) =>
      Promise.all([
        countOfflineVoucherSeries(database, companyId, "sale"),
        countOfflineVoucherSeries(database, companyId, "saleOrder"),
      ]),
  );
  return {
    metadata,
    saleStoredCount,
    saleOrderStoredCount,
    isComplete:
      saleStoredCount === metadata.saleCount &&
      saleOrderStoredCount === metadata.saleOrderCount,
  };
}
