import { useInfiniteQuery } from "@tanstack/react-query";

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
