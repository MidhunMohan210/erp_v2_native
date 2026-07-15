import api from "@/services/api";
import type { VoucherListResponse, VoucherType } from "@/types/voucher";

type GetVoucherListParams = {
  cmpId: string;
  voucherType: VoucherType;
  date: string;
  page?: number;
  limit?: number;
};

export const voucherService = {
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
};
