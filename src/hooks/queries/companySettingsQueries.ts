import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner-native";

import { companySettingsService } from "@/services/companySettings.service";
import type { UpdateCompanySettingsPayload } from "@/types/companySettings";

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

export function useUpdateCompanySettingsMutation(companyId: string) {
  const queryClient = useQueryClient();
  const queryKey = companySettingsQueryKeys.detail(companyId);

  return useMutation({
    mutationFn: (payload: UpdateCompanySettingsPayload) =>
      companySettingsService.updateCompanySettings(companyId, payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKey, settings);
    },
    onError: () => {
      toast.error("Failed to save voucher settings");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
