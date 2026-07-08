import api from "@/services/api";
import type {
  AccountGroup,
  CreatePartyPayload,
  Party,
  PartyListResponse,
  SubGroup,
} from "@/types/party";

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

  getPartyById: async (
    partyId: string,
    options?: { signal?: AbortSignal },
  ): Promise<Party> => {
    const response = await api.get<Party>(`/api/party/${partyId}`, options);
    return response.data;
  },

  createParty: async (payload: CreatePartyPayload) => {
    const response = await api.post<{ message?: string; party?: Party }>(
      "/api/party",
      payload,
    );
    return response.data;
  },

  updateParty: async (partyId: string, payload: CreatePartyPayload) => {
    const response = await api.put<{ message?: string; party?: Party }>(
      `/api/party/${partyId}`,
      payload,
    );
    return response.data;
  },

  getAccountGroups: async (cmp_id: string): Promise<AccountGroup[]> => {
    const response = await api.get<AccountGroup[]>("/api/account-group", {
      params: { cmp_id },
    });
    return response.data || [];
  },

  getSubGroups: async (
    cmp_id: string,
    accountGroup: string,
  ): Promise<SubGroup[]> => {
    const response = await api.get<SubGroup[]>("/api/subgroup", {
      params: { cmp_id, accountGroup },
    });
    return response.data || [];
  },
};
