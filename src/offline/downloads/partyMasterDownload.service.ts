import api from "@/services/api";
import type { OfflineParty } from "@/offline/party/partyMasterRepository";

type PartyMasterPage = {
  items?: OfflineParty[];
  page?: number;
  hasMore?: boolean;
  total?: number;
};

const PARTY_MASTER_PAGE_SIZE = 500;

function isValidTotal(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Downloads the complete Party master separately from the interactive Party list. */
export async function downloadPartyMaster(cmpId: string): Promise<OfflineParty[]> {
  const parties: OfflineParty[] = [];
  let page = 1;
  let total: number | null = null;
  let hasMore = true;

  while (hasMore) {
    const response = await api.get<PartyMasterPage>("/api/party/offline-master", {
      params: { cmp_id: cmpId, page, limit: PARTY_MASTER_PAGE_SIZE },
    });
    const data = response.data;
    if (
      data?.page !== page ||
      !Array.isArray(data.items) ||
      typeof data.hasMore !== "boolean" ||
      !isValidTotal(data.total)
    ) {
      throw new Error("The Party master download returned an invalid page.");
    }
    if (total !== null && data.total !== total) {
      throw new Error("The Party master total changed during download.");
    }

    total = data.total;
    if (parties.length + data.items.length > total) {
      throw new Error("The Party master download contains too many records.");
    }
    if (data.hasMore && data.items.length === 0) {
      throw new Error("The Party master download ended before all pages arrived.");
    }

    parties.push(...data.items);
    if (parties.length === total && data.hasMore) {
      throw new Error("The Party master pagination is inconsistent.");
    }

    hasMore = data.hasMore;
    page += 1;
  }

  if (total === null || parties.length !== total) {
    throw new Error("The Party master download is incomplete.");
  }
  return parties;
}
