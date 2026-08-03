export type TallyIntegrationInfo = {
  masked_key: string;
  status: "active" | "inactive";
};

export type SendTallyIntegrationKeyEmailResponse = {
  message: string;
};
