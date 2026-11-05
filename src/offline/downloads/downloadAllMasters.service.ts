import { importPartyMaster } from "@/offline/party/partyMasterImport.service";
import { importProductMaster } from "@/offline/product/productMasterImport.service";
import { importPriceLevelMaster } from "@/offline/priceLevel/priceLevelMasterImport.service";
import { importVoucherSeriesMaster } from "@/offline/voucherSeries/voucherSeriesMasterImport.service";
import { importAdditionalChargeMaster } from "@/offline/additionalCharge/additionalChargeMasterImport.service";
import { importProductFilterMaster } from "@/offline/productFilter/productFilterMasterImport.service";
import {
  acquireMasterDownloadGuard,
  MasterDownloadCancelledError,
  releaseMasterDownloadGuard,
  type MasterDownloadGuard,
} from "./masterDownloadGuard.service";

export type DownloadAllMasterKey =
  | "parties" | "products" | "priceLevels" | "voucherSeries" | "additionalCharges" | "productFilters";

export type DownloadAllFailure = { key: DownloadAllMasterKey; title: string; message: string };

export type DownloadAllEvent =
  | { phase: "downloading" | "saving" | "completed"; key: DownloadAllMasterKey; completed: number }
  | { phase: "failed"; key: DownloadAllMasterKey; completed: number; failure: DownloadAllFailure }
  | { phase: "partyProgress"; key: "parties"; completed: number; received: number; total: number }
  | { phase: "productProgress"; key: "products"; completed: number; received: number; total: number };

type Step = {
  key: DownloadAllMasterKey;
  title: string;
  run: (guard: MasterDownloadGuard, saving: () => void, progress: (received: number, total: number) => void) => Promise<unknown>;
};

const steps: Step[] = [
  { key: "parties", title: "Party", run: (guard, saving, progress) => importPartyMaster(guard.userId, guard.companyId, guard, saving, (value) => progress(value.received, value.total)) },
  { key: "products", title: "Product", run: (guard, saving, progress) => importProductMaster(guard.userId, guard.companyId, (value) => progress(value.received, value.total), guard, saving) },
  { key: "priceLevels", title: "Price Level", run: (guard, saving) => importPriceLevelMaster(guard.userId, guard.companyId, guard, saving) },
  { key: "voucherSeries", title: "Voucher Series", run: (guard, saving) => importVoucherSeriesMaster(guard.userId, guard.companyId, guard, saving) },
  { key: "additionalCharges", title: "Additional Charges", run: (guard, saving) => importAdditionalChargeMaster(guard.userId, guard.companyId, guard, saving) },
  { key: "productFilters", title: "Product Filters", run: (guard, saving) => importProductFilterMaster(guard.userId, guard.companyId, guard, saving) },
];

export class DownloadAllMasterError extends Error {
  master: string;

  constructor(master: string, error: unknown) {
    super(typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : String(error));
    this.master = master;
  }
}

export function getMasterDownloadErrorMessage(error: unknown): string {
  const response = typeof error === "object" && error !== null && "response" in error ? error.response : null;
  const status = typeof response === "object" && response !== null && "status" in response ? response.status : null;
  if (status === 401 || status === 403) return "Your session needs attention. Sign in again and retry.";
  if (typeof status === "number") return "The server could not provide this master. Please try again later.";
  const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : "";
  if (/network|timeout|connection|failed to fetch/i.test(message)) return "Connection interrupted. Check your internet and retry.";
  if (/invalid|incomplete|inconsistent|duplicate|changed during|before all pages|too many records|needs |must |reference/i.test(message)) {
    return "The downloaded data was incomplete or invalid. Your saved data was kept.";
  }
  return "This master could not be updated. Your saved data was kept. Please retry.";
}

/** Each completed event follows a committed importer result. */
export async function downloadAllMasters(
  userId: string,
  companyId: string,
  onEvent: (event: DownloadAllEvent) => void,
  retryKeys?: DownloadAllMasterKey[],
): Promise<void> {
  const guard = acquireMasterDownloadGuard(userId, companyId);
  let completed = 0;
  try {
    for (const step of steps) {
      if (retryKeys && !retryKeys.includes(step.key)) continue;
      guard.assertCurrent();
      onEvent({ phase: "downloading", key: step.key, completed });
      let savingStarted = false;
      try {
        await step.run(
          guard,
          () => { savingStarted = true; onEvent({ phase: "saving", key: step.key, completed }); },
          (received, total) => onEvent(step.key === "parties"
            ? { phase: "partyProgress", key: "parties", completed, received, total }
            : { phase: "productProgress", key: "products", completed, received, total }),
        );
      } catch (error) {
        if (error instanceof MasterDownloadCancelledError) throw error;
        guard.assertCurrent();
        if (savingStarted) throw new DownloadAllMasterError(step.title, error);
        onEvent({
          phase: "failed", key: step.key, completed,
          failure: { key: step.key, title: step.title, message: getMasterDownloadErrorMessage(error) },
        });
        continue;
      }
      guard.assertCurrent();
      completed += 1;
      onEvent({ phase: "completed", key: step.key, completed });
    }
  } finally {
    releaseMasterDownloadGuard(guard);
  }
}
