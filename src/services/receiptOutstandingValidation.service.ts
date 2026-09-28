import { outstandingService } from "./outstanding.service";
import type { OutstandingBill } from "../types/outstanding";

type LoadCurrentReceiptOutstandingInput = {
  partyId: string;
  companyId: string;
};

export async function loadCurrentReceiptOutstanding({
  partyId,
  companyId,
}: LoadCurrentReceiptOutstandingInput): Promise<OutstandingBill[]> {
  const bills = new Map<string, OutstandingBill>();
  let page = 1;
  let hasMore = true;

  // Read every eligible page before the first POST. This makes both stale-row
  // checks and a confirmed advance independent of an old pagination cache.
  while (hasMore) {
    const response = await outstandingService.getPartyOutstanding({
      partyId,
      cmp_id: companyId,
      page,
      limit: 100,
      classification: "dr",
      isCancelled: false,
      positiveOnly: true,
    });

    for (const bill of response.items) bills.set(bill._id, bill);

    hasMore = response.hasMore;
    page += 1;

    if (page > 1000) {
      throw new Error("Outstanding pagination could not be completed");
    }
  }

  return Array.from(bills.values());
}
