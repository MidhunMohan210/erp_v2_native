import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { voucherSeriesService } from "@/services/voucherSeries.service";
import { voucherService } from "@/services/voucher.service";
import type { VoucherType } from "@/types/voucher";

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
