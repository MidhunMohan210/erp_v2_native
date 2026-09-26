import { useInfiniteQuery } from "@tanstack/react-query";

import { outstandingService } from "@/services/outstanding.service";

type UseInfinitePartyOutstandingQueryParams = {
  partyId: string;
  cmp_id: string;
  limit?: number;
  enabled?: boolean;
};

export const outstandingQueryKeys = {
  all: ["outstanding"] as const,
  party: (partyId: string, cmp_id: string, limit: number) =>
    ["outstanding", "party", { partyId, cmp_id, limit }] as const,
};

export function useInfinitePartyOutstandingQuery({
  partyId,
  cmp_id,
  limit = 20,
  enabled = true,
}: UseInfinitePartyOutstandingQueryParams) {
  return useInfiniteQuery({
    queryKey: outstandingQueryKeys.party(partyId, cmp_id, limit),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      outstandingService.getPartyOutstanding({
        partyId,
        cmp_id,
        page: pageParam,
        limit,
        // Matches the web report: completed or zero-pending bills stay hidden.
        positiveOnly: true,
        signal,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(partyId) && Boolean(cmp_id) && enabled,
    staleTime: 30_000,
  });
}
