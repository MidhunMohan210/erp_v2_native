import { useQuery } from "@tanstack/react-query";

import { integrationService } from "@/services/integration.service";

export const integrationQueryKeys = {
  tally: (companyId: string) => ["integrations", "tally", companyId],
};

export function useTallyIntegrationInfoQuery(
  companyId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: integrationQueryKeys.tally(companyId),
    queryFn: () => integrationService.getTallyIntegrationInfo(companyId),
    enabled: Boolean(companyId) && enabled,
    staleTime: 60_000,
  });
}
