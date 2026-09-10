import api from "@/services/api";
import type { SaleDetail, SaleDraft, SaleItem } from "@/types/sale";
import type {
  AdditionalChargeAction,
  SaleOrderDespatchDetails,
} from "@/types/saleOrder";
import type { VoucherSeriesItem } from "@/types/voucher";
import type { SaleAuditListResponse, SaleAuditResponse } from "@/types/saleAudit";
import type { SaleResetResponse } from "@/types/saleReset";

export type CreateSaleItemPayload = {
  itemId: string;
  godownId: string;
  godownStockRowId: string;
  selectedUnit: string;
  actualQty: number;
  billedQty: number;
  rate: number;
  taxInclusive: boolean;
  discountType: "amount" | "percentage";
  discountValue: number;
  description?: string;
  warrantyCardId?: string | null;
  initialPriceSource?: string | null;
};

export type CreateSaleAdditionalChargePayload = {
  additionalChargeId: string;
  // The currently deployed Sale endpoint accepts this existing alias.
  chargeMasterId: string;
  action: AdditionalChargeAction;
  value: number;
};

export type CreateSalePayload = {
  request_id: string;
  selectedSeries: { _id: string };
  transactionDate: string;
  partyId: string;
  priceLevelId: string | null;
  items: CreateSaleItemPayload[];
  additionalCharges: CreateSaleAdditionalChargePayload[];
  despatchDetails: Partial<SaleOrderDespatchDetails>;
  narration?: string;
};

type BuildSaleCreatePayloadInput = Pick<
  SaleDraft,
  | "transactionDate"
  | "selectedParty"
  | "selectedPriceLevel"
  | "items"
  | "additionalCharges"
  | "despatchDetails"
  | "narration"
> & {
  selectedSeries: VoucherSeriesItem;
  request_id: string;
};

export type CreateSaleResponse = {
  success: boolean;
  message?: string;
  data?: {
    sale?: {
      _id: string;
      voucher_number?: string;
    } & SaleDetail;
  };
};

export type GetSaleDetailResponse = {
  success: boolean;
  data: {
    sale: SaleDetail;
  };
};

export type ResetSaleTestDataInput = {
  cmpId: string;
  dryRun?: boolean;
};

function trimOptionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function buildDespatchDetails(
  details: SaleOrderDespatchDetails,
): Partial<SaleOrderDespatchDetails> {
  return {
    challanNo: trimOptionalText(details.challanNo),
    containerNo: trimOptionalText(details.containerNo),
    despatchThrough: trimOptionalText(details.despatchThrough),
    destination: trimOptionalText(details.destination),
    vehicleNo: trimOptionalText(details.vehicleNo),
    orderNo: trimOptionalText(details.orderNo),
    termsOfPay: trimOptionalText(details.termsOfPay),
    termsOfDelivery: trimOptionalText(details.termsOfDelivery),
  };
}

function buildSaleItemPayload(item: SaleItem): CreateSaleItemPayload {
  const discountValue =
    item.discountType === "percentage"
      ? item.discountPercentage
      : item.discountAmount;
  const description = trimOptionalText(item.description);

  return {
    // `itemId` is the backend Product ID. `id` is only a unique Redux line key.
    itemId: item.itemId,
    godownId: item.godownId,
    godownStockRowId: item.godownStockRowId,
    selectedUnit: item.selectedUnit,
    actualQty: item.actualQty,
    billedQty: item.billedQty,
    rate: item.rate,
    taxInclusive: item.taxInclusive,
    discountType: item.discountType,
    discountValue,
    ...(description ? { description } : {}),
    ...(item.warrantyCardId ? { warrantyCardId: item.warrantyCardId } : {}),
    ...(item.initialPriceSource
      ? { initialPriceSource: item.initialPriceSource }
      : {}),
  };
}

/** Maps only client-owned draft values; the server recalculates all Sale totals. */
export function buildSaleCreatePayload(
  input: BuildSaleCreatePayloadInput,
): CreateSalePayload {
  const narration = trimOptionalText(input.narration);

  return {
    request_id: input.request_id,
    selectedSeries: { _id: input.selectedSeries._id },
    transactionDate: input.transactionDate,
    // Validation is done before this mapper, so the selected party is present.
    partyId: input.selectedParty?._id ?? "",
    priceLevelId: input.selectedPriceLevel?._id ?? null,
    items: input.items.map(buildSaleItemPayload),
    additionalCharges: input.additionalCharges.map((charge) => ({
      // A saved row `_id` is not a master ID, so never use it for new payloads.
      additionalChargeId: charge.additionalChargeId ?? "",
      chargeMasterId: charge.additionalChargeId ?? "",
      action: charge.action,
      value: Number(charge.value),
    })),
    despatchDetails: buildDespatchDetails(input.despatchDetails),
    ...(narration ? { narration } : {}),
  };
}

/**
 * Compares the backend-relevant payload without the idempotency key. The
 * backend is first-request-wins, so a changed draft must not reuse its key.
 */
export function getSaleCreatePayloadSignature(
  payload: CreateSalePayload,
): string {
  const { request_id: ignoredRequestId, ...salePayload } = payload;
  void ignoredRequestId;
  return JSON.stringify(salePayload);
}

export function getSaleDraftValidationError(
  companyId: string,
  draft: SaleDraft,
): string | null {
  if (!companyId) return "Select a company first";
  if (!draft.selectedSeries) return "Select a sale voucher series";
  if (!draft.transactionDate) return "Select a transaction date";
  if (!draft.selectedParty) return "Select a customer";
  if (draft.items.length === 0) return "Add at least one product";

  for (const item of draft.items) {
    if (
      !item.itemId ||
      !item.godownId ||
      !item.godownStockRowId ||
      !item.selectedUnit
    ) {
      return "Every sale item needs a product and stock location";
    }
    if (
      !Number.isFinite(item.actualQty) ||
      !Number.isFinite(item.billedQty) ||
      item.actualQty <= 0 ||
      item.billedQty <= 0
    ) {
      return "Sale item quantities must be greater than 0";
    }
    if (!Number.isFinite(item.rate)) {
      return "Every sale item needs a valid rate";
    }
  }

  if (
    draft.additionalCharges.some(
      (charge) =>
        !charge.additionalChargeId ||
        !Number.isFinite(Number(charge.value)),
    )
  ) {
    return "Additional charges must have a valid master and value";
  }

  return null;
}

export const saleService = {
  async createSale(
    payload: CreateSalePayload,
    companyId: string,
  ): Promise<CreateSaleResponse> {
    // The route middleware resolves company access from this header. Keep it
    // outside the body because the Sale controller owns its persisted company ID.
    const response = await api.post<CreateSaleResponse>("/api/sales", payload, {
      headers: { "X-Company-Id": companyId },
    });
    return response.data;
  },

  async getSaleById(saleId: string, companyId: string): Promise<SaleDetail> {
    const response = await api.get<GetSaleDetailResponse>(
      `/api/sales/${saleId}`,
      {
        // Company access middleware resolves the active company from this
        // existing request convention, as it does for Sale Orders.
        params: { cmpId: companyId },
      },
    );
    return response.data.data.sale;
  },

  async getSaleAudit(saleId: string, companyId: string): Promise<SaleAuditResponse> {
    const response = await api.get<SaleAuditResponse>(`/api/sales/${saleId}/audit`, {
      headers: { "X-Company-Id": companyId },
    });
    return response.data;
  },

  async getSalesForAudit(
    companyId: string,
    page: number,
  ): Promise<SaleAuditListResponse> {
    // Sales already publish read-only timeline rows through the shared voucher API.
    const response = await api.get<{ data?: SaleAuditListResponse }>("/api/vouchers", {
      params: {
        cmpId: companyId,
        voucherType: "sale",
        from: "2000-01-01",
        to: new Date().toISOString().slice(0, 10),
        page,
        limit: 30,
      },
    });
    return response.data.data ?? { page, hasMore: false, vouchers: [] };
  },

  async resetSaleTestData({
    cmpId,
    dryRun = false,
  }: ResetSaleTestDataInput): Promise<SaleResetResponse> {
    const response = await api.post<SaleResetResponse>("/api/dev/reset-sales", {
      cmp_id: cmpId,
      // The backend requires this exact value so reset cannot happen by accident.
      confirm: "RESET_SALE_TRANSACTIONS",
    }, {
      params: dryRun ? { dryRun: true } : undefined,
    });
    return response.data;
  },
};
