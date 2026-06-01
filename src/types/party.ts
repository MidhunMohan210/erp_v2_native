export type Party = {
  _id: string;
  partyName?: string;
  mobileNumber?: string;
  emailID?: string;
  partyType?: string;
  ledgerType?: string;
  totalOutstanding?: number;
  netOutstanding?: number;
  classification?: "cr" | "dr" | string;
};

export type PartyListResponse = {
  items: Party[];
  page: number;
  hasMore: boolean;
  total?: number;
  limit?: number;
};
