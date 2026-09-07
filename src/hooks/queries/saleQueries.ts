import { useMutation } from "@tanstack/react-query";

import {
  saleService,
  type CreateSalePayload,
} from "@/services/sale.service";

type CreateSaleMutationInput = {
  companyId: string;
  payload: CreateSalePayload;
};

/** Mutation state stays in React Query so the Redux draft remains retryable. */
export function useCreateSaleMutation() {
  return useMutation({
    mutationFn: ({ companyId, payload }: CreateSaleMutationInput) =>
      saleService.createSale(payload, companyId),
  });
}
