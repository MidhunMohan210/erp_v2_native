import api from "@/services/api";
import type {
  OfflineVoucherSeries,
  OfflineVoucherSeriesType,
} from "@/offline/voucherSeries/voucherSeriesMasterRepository";

type VoucherSeriesResponse = { series?: unknown };

function isNoSeriesFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const response = error.response;
  if (!response || typeof response !== "object") return false;
  const status = "status" in response ? response.status : undefined;
  const data = "data" in response ? response.data : undefined;
  return (
    status === 404 &&
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    data.message === "No series found for this voucher type"
  );
}

/** Downloads one complete voucher type; the recognized missing-series 404 is empty. */
export async function downloadVoucherSeriesMaster(
  companyId: string,
  voucherType: OfflineVoucherSeriesType,
): Promise<OfflineVoucherSeries[]> {
  try {
    const response = await api.get<VoucherSeriesResponse>(
      `/api/voucher-series/${companyId}`,
      { params: { voucherType, restrict: true } },
    );
    if (!Array.isArray(response.data?.series)) {
      throw new Error("The Voucher Series download returned an invalid response.");
    }
    return response.data.series.map((series) => ({
      ...(series as Omit<OfflineVoucherSeries, "voucherType">),
      voucherType,
    }));
  } catch (error) {
    if (isNoSeriesFoundError(error)) return [];
    throw error;
  }
}
