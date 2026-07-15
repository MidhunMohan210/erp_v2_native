import api from "@/services/api";
import type {
  CreateVoucherSeriesPayload,
  VoucherSeriesItem,
  VoucherSeriesPayload,
  VoucherSeriesResponse,
  VoucherType,
} from "@/types/voucher";

type GetVoucherSeriesParams = {
  cmp_id: string;
  voucherType: VoucherType;
};

type UpdateVoucherSeriesParams = {
  cmp_id: string;
  seriesId: string;
  payload: VoucherSeriesPayload;
};

type DeleteVoucherSeriesParams = {
  cmp_id: string;
  seriesId: string;
  voucherType: VoucherType;
};

export const voucherSeriesService = {
  async getVoucherSeries({
    cmp_id,
    voucherType,
  }: GetVoucherSeriesParams): Promise<VoucherSeriesResponse> {
    const response = await api.get<VoucherSeriesResponse>(
      `/api/voucher-series/${cmp_id}`,
      {
        params: {
          voucherType,
          restrict: true,
        },
      },
    );

    return {
      voucherSeriesId: response.data?.voucherSeriesId,
      series: response.data?.series ?? [],
    };
  },

  async createVoucherSeries(
    cmp_id: string,
    payload: CreateVoucherSeriesPayload,
  ): Promise<VoucherSeriesResponse> {
    const response = await api.post<VoucherSeriesResponse>(
      `/api/voucher-series/${cmp_id}`,
      payload,
    );

    return {
      voucherSeriesId: response.data?.voucherSeriesId,
      series: response.data?.series ?? [],
    };
  },

  async updateVoucherSeries({
    cmp_id,
    seriesId,
    payload,
  }: UpdateVoucherSeriesParams): Promise<VoucherSeriesResponse> {
    const response = await api.put<VoucherSeriesResponse>(
      `/api/voucher-series/${cmp_id}/${seriesId}`,
      payload,
    );

    return {
      voucherSeriesId: response.data?.voucherSeriesId,
      series: response.data?.series ?? [],
    };
  },

  async deleteVoucherSeries({
    cmp_id,
    seriesId,
    voucherType,
  }: DeleteVoucherSeriesParams): Promise<VoucherSeriesResponse> {
    const response = await api.delete<VoucherSeriesResponse>(
      `/api/voucher-series/${cmp_id}/${seriesId}`,
      {
        data: {
          voucherType,
          seriesId,
        },
      },
    );

    return {
      voucherSeriesId: response.data?.voucherSeriesId,
      series: response.data?.series ?? [],
    };
  },
};

export function formatVoucherSeriesNumber(series: VoucherSeriesItem): string {
  const width = series.widthOfNumericalPart ?? 1;
  const currentNumber = String(series.currentNumber ?? 0).padStart(width, "0");
  const prefix = series.prefix ? `${series.prefix}/` : "";
  const suffix = series.suffix ? `/${series.suffix}` : "";

  return `${prefix}${currentNumber}${suffix}`;
}
