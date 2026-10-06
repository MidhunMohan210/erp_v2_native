import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { outstandingService } from "@/services/outstanding.service";

type UseInfinitePartyOutstandingQueryParams = {
  partyId: string;
  cmp_id: string;
  limit?: number;
  enabled?: boolean;
};

type UseReceiptOutstandingQueryParams = {
  partyId: string;
  cmp_id: string;
  enabled?: boolean;
};

export const outstandingQueryKeys = {
  all: ["outstanding"] as const,
  party: (partyId: string, cmp_id: string, limit: number) =>
    [
      "outstanding",
      "party",
      {
        scope: "general",
        partyId,
        cmp_id,
        limit,
        excludeZero: true,
      },
    ] as const,
  receiptParty: (partyId: string, cmp_id: string) =>
    [
      "outstanding",
      "party",
      {
        scope: "receipt",
        partyId,
        cmp_id,
        classification: "dr",
        isCancelled: false,
        positiveOnly: true,
        all: true,
      },
    ] as const,
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
        // The Outstanding report needs both positive DR and negative CR bills,
        // but never fully settled zero-balance rows.
        excludeZero: true,
        signal,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(partyId) && Boolean(cmp_id) && enabled,
    staleTime: 30_000,
  });
}

export function useReceiptOutstandingQuery({
  partyId,
  cmp_id,
  enabled = true,
}: UseReceiptOutstandingQueryParams) {
  return useQuery({
    queryKey: outstandingQueryKeys.receiptParty(partyId, cmp_id),
    queryFn: ({ signal }) =>
      outstandingService.getPartyOutstanding({
        partyId,
        cmp_id,
        page: 1,
        classification: "dr",
        isCancelled: false,
        positiveOnly: true,
        // Receipt allocation must calculate from every eligible bill, not a
        // paginated subset that could incorrectly look like an advance.
        all: true,
        signal,
      }),
    enabled: Boolean(partyId) && Boolean(cmp_id) && enabled,
    staleTime: 30_000,
  });
}
