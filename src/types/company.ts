

export type FinancialYear = {
  format: string;
  startingYear: number;
  startMonth: number;
  endMonth: number;
};

export type CompanyType = "integrated" | "standalone";


export type Company = {
  _id: string;
  name: string;
  flat?: string;
  road?: string;
  place?: string;
  landmark?: string;
  pin?: string;
  country?: string;
  state?: string;
  email?: string;
  mobile?: string;
  gstNum?: string;
  pan?: string;
  website?: string;
  logo?: string;
  type?: CompanyType;
  currency?: string;
  currencyName?: string;
  currencySymbol?: string;
  owner?: string;
  isBlocked?: boolean;
  isApproved?: boolean;
  batchEnabled?: boolean;
  gdnEnabled?: boolean;
  industry?: string;
  configurations?: unknown[];
  financialYear?: FinancialYear;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
};

export type CompanySummary = Pick<
  Company,
  "_id" | "name" | "email" | "mobile" | "place" | "state" | "country" | "logo" | "type"
>;