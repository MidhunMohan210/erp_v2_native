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

export type DownloadAllEvent =
  | { phase: "downloading" | "saving" | "completed"; key: DownloadAllMasterKey; completed: number }
  | { phase: "productProgress"; key: "products"; completed: number; received: number; total: number };

type Step = {
  key: DownloadAllMasterKey;
  title: string;
  run: (guard: MasterDownloadGuard, saving: () => void, progress: (received: number, total: number) => void) => Promise<unknown>;
};

const steps: Step[] = [
  { key: "parties", title: "Party", run: (guard, saving) => importPartyMaster(guard.userId, guard.companyId, guard, saving) },
  { key: "products", title: "Product", run: (guard, saving, progress) => importProductMaster(guard.userId, guard.companyId, (value) => progress(value.received, value.total), guard, saving) },
  { key: "priceLevels", title: "Price Level", run: (guard, saving) => importPriceLevelMaster(guard.userId, guard.companyId, guard, saving) },
  { key: "voucherSeries", title: "Voucher Series", run: (guard, saving) => importVoucherSeriesMaster(guard.userId, guard.companyId, guard, saving) },
  { key: "additionalCharges", title: "Additional Charges", run: (guard, saving) => importAdditionalChargeMaster(guard.userId, guard.companyId, guard, saving) },
  { key: "productFilters", title: "Product Filters", run: (guard, saving) => importProductFilterMaster(guard.userId, guard.companyId, guard, saving) },
];

export class DownloadAllMasterError extends Error {
  master: string;

  constructor(master: string, error: unknown) {
    super(error instanceof Error ? error.message : String(error));
    this.master = master;
  }
}

/** Each completed event follows a committed importer result. */
export async function downloadAllMasters(
  userId: string,
  companyId: string,
  onEvent: (event: DownloadAllEvent) => void,
): Promise<void> {
  const guard = acquireMasterDownloadGuard(userId, companyId);
  let completed = 0;
  try {
    for (const step of steps) {
      guard.assertCurrent();
      onEvent({ phase: "downloading", key: step.key, completed });
      try {
        await step.run(
          guard,
          () => onEvent({ phase: "saving", key: step.key, completed }),
          (received, total) => onEvent({ phase: "productProgress", key: "products", completed, received, total }),
        );
      } catch (error) {
        if (error instanceof MasterDownloadCancelledError) throw error;
        throw new DownloadAllMasterError(step.title, error);
      }
      guard.assertCurrent();
      completed += 1;
      onEvent({ phase: "completed", key: step.key, completed });
    }
  } finally {
    releaseMasterDownloadGuard(guard);
  }
}
