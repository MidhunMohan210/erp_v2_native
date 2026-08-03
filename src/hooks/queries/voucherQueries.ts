import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { voucherSeriesService } from "@/services/voucherSeries.service";
import { voucherService } from "@/services/voucher.service";
import type { DaybookFilters, VoucherType } from "@/types/voucher";

function getLocalDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export const voucherSeriesQueryKeys = {
  list: (cmp_id: string, voucherType: VoucherType) => [
    ...QUERY_KEYS.voucherSeries,
    cmp_id,
    voucherType,
  ],
};

export const voucherListQueryKeys = {
  list: (cmpId: string, voucherType: VoucherType, date: string) => [
    ...QUERY_KEYS.vouchers,
    cmpId,
    voucherType,
    date,
  ],
};

export const voucherTotalsSummaryQueryKeys = {
  detail: (cmpId: string, date: string) => [
    "vouchers",
    "summary",
    cmpId,
    date,
  ],
  company: (cmpId: string) => ["vouchers", "summary", cmpId],
};

export const daybookQueryKeys = {
  list: (cmpId: string, filters: DaybookFilters) => [
    "daybook",
    cmpId,
    filters.from,
    filters.to,
    filters.voucherTypes.join(",") || "all",
  ],
};

export function useVoucherSeriesListQuery(
  cmp_id: string,
  voucherType: VoucherType,
  enabled = true,
) {
  return useQuery({
    queryKey: voucherSeriesQueryKeys.list(cmp_id, voucherType),
    queryFn: () => voucherSeriesService.getVoucherSeries({ cmp_id, voucherType }),
    enabled: Boolean(cmp_id) && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useVoucherTotalsSummaryQuery(
  cmpId: string,
  enabled = true,
) {
  const date = getLocalDateString();

  return useQuery({
    queryKey: voucherTotalsSummaryQueryKeys.detail(cmpId, date),
    queryFn: () => voucherService.getVoucherTotalsSummary(cmpId, date),
    enabled: Boolean(cmpId) && enabled,
    staleTime: 30_000,
  });
}

export function useVoucherListQuery(
  cmpId: string,
  voucherType: VoucherType,
  date: string,
  enabled = true,
) {
  return useQuery({
    queryKey: voucherListQueryKeys.list(cmpId, voucherType, date),
    queryFn: () =>
      voucherService.getVoucherList({
        cmpId,
        voucherType,
        date,
      }),
    enabled: Boolean(cmpId) && Boolean(date) && enabled,
    staleTime: 30_000,
  });
}

export function useDaybookQuery(
  cmpId: string,
  filters: DaybookFilters,
  enabled = true,
) {
  const voucherType =
    filters.voucherTypes.length === 0 || filters.voucherTypes.length === 2
      ? "all"
      : filters.voucherTypes.join(",");

  return useInfiniteQuery({
    queryKey: daybookQueryKeys.list(cmpId, filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      voucherService.getDaybook({
        cmpId,
        from: filters.from,
        to: filters.to,
        voucherType,
        page: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(cmpId) && Boolean(filters.from) && Boolean(filters.to) && enabled,
    staleTime: 30_000,
  });
}
