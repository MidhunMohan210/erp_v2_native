import { useQuery } from "@tanstack/react-query";

import { companySettingsService } from "@/services/companySettings.service";

export const companySettingsQueryKeys = {
  detail: (companyId: string) => ["company-settings", companyId],
};

export function useCompanySettingsQuery(
  companyId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: companySettingsQueryKeys.detail(companyId),
    queryFn: () => companySettingsService.getCompanySettings(companyId),
    enabled: Boolean(companyId) && enabled,
    staleTime: 60_000,
  });
}
