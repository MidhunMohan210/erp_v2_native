export type CompanyBankAccount = {
  _id?: string;
  partyName?: string;
  bank_name?: string;
  ac_no?: string;
  ifsc?: string;
  branch?: string;
};

export type CompanySettings = {
  dataEntry?: {
    voucher?: {
      defaultBankAccountId?: CompanyBankAccount | null;
    };
    order?: {
      termsAndConditions?: string[];
    };
    sale?: {
      termsAndConditions?: string[];
    };
  };
};

// The API returns a populated bank object, but updates accept only its id.
export type UpdateCompanySettingsPayload = {
  dataEntry?: {
    voucher?: {
      defaultBankAccountId?: string | null;
    };
    order?: {
      termsAndConditions?: string[];
    };
    sale?: {
      termsAndConditions?: string[];
    };
  };
};
