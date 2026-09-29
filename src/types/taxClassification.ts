export const TAXABILITY_TYPES = [
  "Taxable",
  "Exempt",
  "Nil Rated",
  "Non-GST",
] as const;

export type TaxabilityType = (typeof TAXABILITY_TYPES)[number];
export type TaxCalculationMode = "on_value" | "on_item_rate";

export interface TaxFields {
  taxability_type: TaxabilityType;
  igst_rate: number;
  cgst_rate: number;
  sgst_utgst_rate: number;
  cess_based_on_value: number;
  cess_based_on_quantity: number;
}

export interface TaxRateSlab extends TaxFields {
  greater_than: number;
  upto: number;
}

export interface TaxClassification {
  _id: string;
  cmp_id: string;
  Primary_user_id: string;
  hsn_code: string;
  description: string;
  calculation_mode: TaxCalculationMode;
  on_value?: TaxFields;
  rate_slabs: TaxRateSlab[];
  applicable_for_revised_charge: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxClassificationPayload {
  hsn_code: string;
  description: string;
  calculation_mode: TaxCalculationMode;
  applicable_for_revised_charge: boolean;
  on_value?: TaxFields;
  rate_slabs?: TaxRateSlab[];
}
