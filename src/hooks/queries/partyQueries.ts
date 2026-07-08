import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { partyService } from "@/services/party.service";

const PARTIES_STALE_TIME = 5 * 60_000;

type UseInfinitePartyListQueryParams = {
  cmp_id: string;
  limit?: number;
  search?: string;
  ledgerType?: string;
  partyType?: string;
  enabled?: boolean;
};

export const partyQueryKeys = {
  detail: (partyId: string) => [...QUERY_KEYS.parties, "detail", partyId],
  infiniteList: (
    cmp_id: string,
    limit = 20,
    search = "",
    ledgerType = "all",
    partyType = "",
  ) => [
    ...QUERY_KEYS.parties,
    "infinite-list",
    { cmp_id, limit, search, ledgerType, partyType },
  ],
};

export const accountGroupQueryKeys = {
  list: (cmp_id: string) => ["account-groups", "list", cmp_id || ""],
};

export const subGroupQueryKeys = {
  list: (cmp_id: string, accountGroupId: string) => [
    "sub-groups",
    "list",
    cmp_id || "",
    accountGroupId || "",
  ],
};

export function useInfinitePartyListQuery({
  cmp_id,
  limit = 20,
  search = "",
  ledgerType = "all",
  partyType = "",
  enabled = true,
}: UseInfinitePartyListQueryParams) {
  return useInfiniteQuery({
    queryKey: partyQueryKeys.infiniteList(
      cmp_id,
      limit,
      search,
      ledgerType,
      partyType,
    ),
    queryFn: ({ pageParam = 1, signal }) =>
      partyService.getParties({
        page: pageParam,
        limit,
        cmp_id,
        search,
        ledgerType,
        partyType,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(cmp_id) && enabled,
    staleTime: PARTIES_STALE_TIME,
  });
}

export function usePartyByIdQuery(partyId: string, enabled = true) {
  return useQuery({
    queryKey: partyQueryKeys.detail(partyId || ""),
    queryFn: ({ signal }) =>
      partyService.getPartyById(partyId, { signal: signal as AbortSignal }),
    enabled: Boolean(partyId) && enabled,
    staleTime: 30_000,
  });
}

export function useAccountGroupListQuery(cmp_id: string, enabled = true) {
  return useQuery({
    queryKey: accountGroupQueryKeys.list(cmp_id),
    queryFn: () => partyService.getAccountGroups(cmp_id),
    enabled: Boolean(cmp_id) && enabled,
    staleTime: PARTIES_STALE_TIME,
  });
}

export function useSubGroupListQuery(
  cmp_id: string,
  accountGroupId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: subGroupQueryKeys.list(cmp_id, accountGroupId),
    queryFn: () => partyService.getSubGroups(cmp_id, accountGroupId),
    enabled: Boolean(cmp_id) && Boolean(accountGroupId) && enabled,
    staleTime: PARTIES_STALE_TIME,
  });
}
