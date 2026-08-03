import api from "@/services/api";
import type {
  DaybookVoucherType,
  VoucherListResponse,
  VoucherTotalsSummary,
  VoucherType,
} from "@/types/voucher";

type GetVoucherListParams = {
  cmpId: string;
  voucherType: VoucherType;
  date: string;
  page?: number;
  limit?: number;
};

type GetDaybookParams = {
  cmpId: string;
  from: string;
  to: string;
  voucherType: DaybookVoucherType | string;
  page?: number;
  limit?: number;
};

export const voucherService = {
  async getVoucherTotalsSummary(
    cmpId: string,
    date: string,
  ): Promise<VoucherTotalsSummary> {
    const response = await api.get<{
      success?: boolean;
      data?: VoucherTotalsSummary;
    }>("/api/vouchers/summary", {
      params: { cmpId, date },
    });

    return (
      response.data?.data ?? {
        date,
        totals: { saleOrder: 0, receipt: 0 },
      }
    );
  },

  async getVoucherList({
    cmpId,
    voucherType,
    date,
    page = 1,
    limit = 50,
  }: GetVoucherListParams): Promise<VoucherListResponse> {
    const response = await api.get<{
      success?: boolean;
      data?: VoucherListResponse;
    }>("/api/vouchers", {
      params: {
        cmpId,
        voucherType,
        from: date,
        to: date,
        page,
        limit,
      },
    });

    return (
      response.data?.data ?? {
        page,
        limit,
        hasMore: false,
        vouchers: [],
      }
    );
  },

  async getDaybook({
    cmpId,
    from,
    to,
    voucherType,
    page = 1,
    limit = 20,
  }: GetDaybookParams): Promise<VoucherListResponse> {
    const response = await api.get<{
      success?: boolean;
      data?: VoucherListResponse;
    }>("/api/vouchers", {
      params: {
        cmpId,
        from,
        to,
        voucherType,
        page,
        limit,
      },
    });

    return (
      response.data?.data ?? {
        from,
        to,
        page,
        limit,
        hasMore: false,
        count: 0,
        vouchers: [],
      }
    );
  },
};
