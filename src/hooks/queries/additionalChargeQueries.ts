import { useQuery } from "@tanstack/react-query";

import { additionalChargeService } from "@/services/additionalCharge.service";

const ADDITIONAL_CHARGE_STALE_TIME = 5 * 60_000;

export const additionalChargeQueryKeys = {
  list: (companyId: string) => ["additional-charges", companyId],
};

export function useAdditionalChargeListQuery(
  companyId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: additionalChargeQueryKeys.list(companyId),
    queryFn: ({ signal }) =>
      additionalChargeService.getAdditionalCharges(companyId, signal),
    enabled: Boolean(companyId) && enabled,
    staleTime: ADDITIONAL_CHARGE_STALE_TIME,
  });
}
