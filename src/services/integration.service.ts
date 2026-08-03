import api from "@/services/api";
import type {
  SendTallyIntegrationKeyEmailResponse,
  TallyIntegrationInfo,
} from "@/types/integration";

export const integrationService = {
  async getTallyIntegrationInfo(companyId: string): Promise<TallyIntegrationInfo> {
    const response = await api.get<TallyIntegrationInfo>(
      "/api/admin/integrations/tally",
      { params: { cmp_id: companyId } },
    );

    return response.data;
  },

  async sendTallyIntegrationKeyEmail(
    companyId: string,
  ): Promise<SendTallyIntegrationKeyEmailResponse> {
    const response = await api.post<SendTallyIntegrationKeyEmailResponse>(
      "/api/admin/integrations/tally/send-key",
      {},
      { params: { cmp_id: companyId } },
    );

    return response.data;
  },
};
