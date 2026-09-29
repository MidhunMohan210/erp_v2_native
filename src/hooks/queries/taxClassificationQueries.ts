import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { taxClassificationService } from "@/services/taxClassification.service";
import type { TaxClassificationPayload } from "@/types/taxClassification";

export const taxClassificationQueryKeys = {
  all: (cmp_id: string) => ["tax-classifications", cmp_id],
  detail: (cmp_id: string, classificationId: string) => [
    "tax-classifications",
    cmp_id,
    "detail",
    classificationId,
  ],
};

export function useTaxClassificationListQuery(cmp_id: string) {
  return useQuery({
    queryKey: taxClassificationQueryKeys.all(cmp_id),
    queryFn: ({ signal }) => taxClassificationService.getTaxClassifications(cmp_id, signal),
    enabled: Boolean(cmp_id),
    staleTime: 5 * 60_000,
  });
}

export function useTaxClassificationDetailQuery(
  cmp_id: string,
  classificationId: string,
) {
  return useQuery({
    queryKey: taxClassificationQueryKeys.detail(cmp_id, classificationId),
    queryFn: ({ signal }) =>
      taxClassificationService.getTaxClassificationById(cmp_id, classificationId, signal),
    enabled: Boolean(cmp_id && classificationId),
  });
}

type SaveTaxClassificationVariables = {
  cmp_id: string;
  classificationId?: string;
  payload: TaxClassificationPayload;
};

export function useSaveTaxClassificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cmp_id, classificationId, payload }: SaveTaxClassificationVariables) =>
      classificationId
        ? taxClassificationService.updateTaxClassification(cmp_id, classificationId, payload)
        : taxClassificationService.createTaxClassification(cmp_id, payload),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: taxClassificationQueryKeys.all(variables.cmp_id),
      });
      if (variables.classificationId) {
        await queryClient.invalidateQueries({
          queryKey: taxClassificationQueryKeys.detail(
            variables.cmp_id,
            variables.classificationId,
          ),
        });
      }
    },
  });
}

export function useDeleteTaxClassificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cmp_id, classificationId }: { cmp_id: string; classificationId: string }) =>
      taxClassificationService.deleteTaxClassification(cmp_id, classificationId),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: taxClassificationQueryKeys.all(variables.cmp_id),
      });
      queryClient.removeQueries({
        queryKey: taxClassificationQueryKeys.detail(
          variables.cmp_id,
          variables.classificationId,
        ),
      });
    },
  });
}
