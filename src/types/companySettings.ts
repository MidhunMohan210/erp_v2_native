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
  };
};
