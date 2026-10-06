import api from "@/services/api";
import type {
  OutstandingBillsResponse,
  OutstandingClassification,
} from "@/types/outstanding";

type GetPartyOutstandingParams = {
  partyId: string;
  cmp_id: string;
  page: number;
  limit?: number;
  classification?: OutstandingClassification;
  isCancelled?: boolean;
  positiveOnly?: boolean;
  excludeZero?: boolean;
  all?: boolean;
  signal?: AbortSignal;
};

export const outstandingService = {
  async getPartyOutstanding({
    partyId,
    cmp_id,
    page,
    limit = 20,
    classification,
    isCancelled,
    positiveOnly,
    excludeZero,
    all,
    signal,
  }: GetPartyOutstandingParams): Promise<OutstandingBillsResponse> {
    const response = await api.get<OutstandingBillsResponse>(
      `/api/outstanding/party/${partyId}`,
      {
        params: {
          cmp_id,
          page,
          limit,
          classification,
          isCancelled,
          positiveOnly,
          excludeZero,
          all,
        },
        signal,
      },
    );

    return response.data;
  },
};
