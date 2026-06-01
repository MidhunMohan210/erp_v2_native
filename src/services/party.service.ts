import api from "@/services/api";
import type { PartyListResponse } from "@/types/party";

type GetPartiesParams = {
  page: number;
  limit?: number;
  cmp_id: string;
  search?: string;
  partyType?: string;
  ledgerType?: string;
  signal?: AbortSignal;
};

export const partyService = {
  getParties: async ({
    page,
    limit = 20,
    cmp_id,
    search = "",
    partyType = "",
    ledgerType = "all",
    signal,
  }: GetPartiesParams): Promise<PartyListResponse> => {
    const response = await api.get<PartyListResponse>("/api/party", {
      params: {
        page,
        limit,
        cmp_id,
        search,
        partyType,
        ledgerType,
      },
      signal,
    });

    return {
      items: response.data?.items ?? [],
      page: response.data?.page ?? page,
      hasMore: Boolean(response.data?.hasMore),
      total: response.data?.total,
      limit: response.data?.limit ?? limit,
    };
  },
};
