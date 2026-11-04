import api from "@/services/api";
import type { OfflineParty } from "@/offline/party/partyMasterRepository";

type PartyMasterPage = {
  items?: OfflineParty[];
  page?: number;
  hasMore?: boolean;
};

const PARTY_MASTER_PAGE_SIZE = 500;

/** Downloads the complete Party master separately from the interactive Party list. */
export async function downloadPartyMaster(cmpId: string): Promise<OfflineParty[]> {
  const parties: OfflineParty[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await api.get<PartyMasterPage>("/api/party/offline-master", {
      params: { cmp_id: cmpId, page, limit: PARTY_MASTER_PAGE_SIZE },
    });
    const responsePage = response.data?.page;
    if (responsePage !== page || !Array.isArray(response.data?.items)) {
      throw new Error("The Party master download returned an invalid page.");
    }
    parties.push(...response.data.items);
    hasMore = Boolean(response.data.hasMore);
    page += 1;
  }

  return parties;
}
