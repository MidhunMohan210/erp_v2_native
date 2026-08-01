import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner-native";

import { printConfigurationService } from "@/services/printConfiguration.service";
import type {
  PrintConfigurationResponse,
  PrintVoucherType,
  SaleOrderPrintConfigPatch,
} from "@/types/printConfiguration";

export const printConfigurationQueryKeys = {
  detail: (companyId: string, voucherType: PrintVoucherType) => [
    "print-configuration",
    companyId,
    voucherType,
  ],
};

export function usePrintConfigurationQuery(
  companyId: string,
  voucherType: PrintVoucherType,
  enabled = true,
) {
  return useQuery({
    queryKey: printConfigurationQueryKeys.detail(companyId, voucherType),
    queryFn: () =>
      printConfigurationService.getPrintConfiguration(companyId, voucherType),
    enabled: Boolean(companyId) && enabled,
    staleTime: 60_000,
  });
}

export function useUpdatePrintConfiguration(
  companyId: string,
  voucherType: PrintVoucherType,
) {
  const queryClient = useQueryClient();
  const queryKey = printConfigurationQueryKeys.detail(companyId, voucherType);

  return useMutation({
    mutationFn: (changes: SaleOrderPrintConfigPatch) =>
      printConfigurationService.updatePrintConfiguration(
        companyId,
        voucherType,
        changes,
      ),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<PrintConfigurationResponse>(queryKey);

      queryClient.setQueryData<PrintConfigurationResponse>(
        queryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            config: {
              ...current.config,
              ...changes,
            },
          };
        },
      );

      return { previous };
    },
    onError: (_error, _changes, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }

      toast.error("Failed to save setting");
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKey, response);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
