import { useQuery } from "@tanstack/react-query";

import { saleOrderService } from "@/services/saleOrder.service";

export const saleOrderQueryKeys = {
  all: ["sale-orders"] as const,
  detail: (saleOrderId: string, cmpId: string) => [
    ...saleOrderQueryKeys.all,
    "detail",
    saleOrderId,
    cmpId,
  ],
};

export function useSaleOrderDetailQuery(
  saleOrderId: string,
  cmpId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: saleOrderQueryKeys.detail(saleOrderId, cmpId),
    queryFn: () => saleOrderService.getSaleOrderById(saleOrderId, cmpId),
    enabled: Boolean(saleOrderId) && Boolean(cmpId) && enabled,
    staleTime: 30_000,
  });
}
