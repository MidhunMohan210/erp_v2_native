import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { subscribeToPendingSubmissionChanges } from "@/services/pendingSubmissions/pendingSubmissionChangeEvents";
import { pendingSubmissionStorageService } from "@/services/pendingSubmissions/pendingSubmissionStorage.service";

export const pendingSubmissionQueryKeys = {
  list: (userId: string, companyId: string) =>
    ["pending-submissions", userId, companyId] as const,
};

export function usePendingSubmissionsQuery(
  userId: string,
  companyId: string,
  enabled = true,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToPendingSubmissionChanges((event) => {
      if (
        event.userId !== userId ||
        (event.companyId !== null && event.companyId !== companyId)
      ) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: pendingSubmissionQueryKeys.list(userId, companyId),
      });
    });
  }, [companyId, queryClient, userId]);

  return useQuery({
    queryKey: pendingSubmissionQueryKeys.list(userId, companyId),
    queryFn: () =>
      pendingSubmissionStorageService.listForUserAndCompany(userId, companyId),
    enabled: Boolean(userId) && Boolean(companyId) && enabled,
  });
}
