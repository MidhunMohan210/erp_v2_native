export type Party = {
  _id: string;
  partyName?: string;
  mobileNumber?: string;
  emailID?: string;
  partyType?: string;
  ledgerType?: string;
  accountGroup?:
    | string
    | {
        _id?: string;
        id?: string;
        accountGroup?: string;
      };
  subGroup?:
    | string
    | {
        _id?: string;
        id?: string;
        subGroup?: string;
      };
  gstNo?: string;
  panNo?: string;
  billingAddress?: string;
  shippingAddress?: string;
  creditPeriod?: string;
  creditLimit?: string;
  openingBalanceType?: "cr" | "dr" | string;
  openingBalanceAmount?: number | string;
  country?: string;
  state?: string;
  pin?: string;
  source?: string;
  totalOutstanding?: number;
  netOutstanding?: number;
  classification?: "cr" | "dr" | string;
};

export type AccountGroup = {
  _id: string;
  accountGroup: string;
};

export type SubGroup = {
  _id: string;
  subGroup: string;
};

export type CreatePartyPayload = {
  cmp_id: string;
  partyName: string;
  partyType: "party" | "bank" | "cash";
  accountGroup: string;
  subGroup?: string;
  mobileNumber: string;
  emailID?: string;
  gstNo?: string;
  panNo?: string;
  billingAddress?: string;
  shippingAddress?: string;
  creditPeriod?: string;
  creditLimit?: string;
  openingBalanceType: "dr" | "cr";
  openingBalanceAmount: number;
  country?: string;
  state?: string;
  pin?: string;
};

export type PartyListResponse = {
  items: Party[];
  page: number;
  hasMore: boolean;
  total?: number;
  limit?: number;
};
