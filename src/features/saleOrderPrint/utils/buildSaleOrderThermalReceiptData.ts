import type { Company } from "@/types/company";
import type { SaleOrderPrintConfig } from "@/types/printConfiguration";
import type { SaleOrderDetail } from "@/types/saleOrder";

export type ThermalReceiptCompanyData = {
  name: string;
  logo?: string;
  detailLines: string[];
};

export type ThermalReceiptCustomerData = {
  name?: string | null;
  billingAddress: string;
  gstLine?: string;
  mobileLine?: string;
};

export type ThermalReceiptProductRow = {
  name: string;
  quantity: string;
  rate: string;
  taxableAmount: string;
};

export type ThermalReceiptAdditionalChargeRow = {
  option: string;
  actionSymbol: string;
  finalValue: string;
};

export type ThermalReceiptSummaryRow = {
  label: string;
  value: string;
};

export type SaleOrderThermalReceiptData = {
  company: ThermalReceiptCompanyData;
  title: string;
  orderNumber: string;
  date: string;
  customer: ThermalReceiptCustomerData;
  productRows: ThermalReceiptProductRow[];
  subtotal: string;
  additionalChargeRows: ThermalReceiptAdditionalChargeRow[];
  additionalChargeTotal: string;
  summaryRows: ThermalReceiptSummaryRow[];
  grandTotal: string;
  footerText: string;
};

type BuildSaleOrderThermalReceiptDataParams = {
  saleOrder: SaleOrderDetail;
  company: Company;
  configuration: SaleOrderPrintConfig;
};

function formatAmount(value?: number | null): string {
  return Number(value ?? 0).toFixed(2);
}

function formatDate(value?: string): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function getSafeImageUrl(value?: string): string | undefined {
  if (!value) return undefined;
  return /^(https?:\/\/|data:image\/)/i.test(value) ? value : undefined;
}

function getCompanyAddress(company: Company): string {
  return [
    company.flat,
    company.road,
    company.place,
    company.landmark,
    company.state,
    company.country,
    company.pin,
  ]
    .filter(Boolean)
    .join(", ");
}

function getCompanyDetailLines(company: Company): string[] {
  return [
    getCompanyAddress(company),
    company.gstNum ? `GSTIN: ${company.gstNum}` : "",
    company.pan ? `PAN: ${company.pan}` : "",
    company.mobile ? `Mobile: ${company.mobile}` : "",
    company.email ? `Email: ${company.email}` : "",
  ].filter(Boolean);
}

export function buildSaleOrderThermalReceiptData({
  saleOrder,
  company,
  configuration,
}: BuildSaleOrderThermalReceiptDataParams): SaleOrderThermalReceiptData {
  const party = saleOrder.party_snapshot;
  const showTaxRows = configuration.enable_tax_amount ?? true;
  const productRows = saleOrder.items.map((item) => ({
    name: item.item_name || "--",
    quantity: formatAmount(item.billed_qty),
    rate: formatAmount(item.rate),
    // Keep the existing thermal PDF behavior: Amount is taxable_amount.
    taxableAmount: formatAmount(item.taxable_amount),
  }));
  const additionalChargeRows = saleOrder.additional_charges.map((charge) => ({
    option: charge.option || "Additional Charge",
    actionSymbol: charge.action === "subtract" ? "-" : "+",
    finalValue: formatAmount(charge.final_value),
  }));
  const summaryRows = [
    [
      "Taxable Value ",
      saleOrder.totals.taxable_amount +
        saleOrder.totals.total_additional_charge,
    ],
    showTaxRows && saleOrder.totals.total_igst_amt > 0
      ? ["IGST", saleOrder.totals.total_igst_amt]
      : null,
    showTaxRows && saleOrder.totals.total_cgst_amt > 0
      ? ["CGST", saleOrder.totals.total_cgst_amt]
      : null,
    showTaxRows && saleOrder.totals.total_sgst_amt > 0
      ? ["SGST", saleOrder.totals.total_sgst_amt]
      : null,
    showTaxRows && saleOrder.totals.total_cess_amt > 0
      ? ["Cess", saleOrder.totals.total_cess_amt]
      : null,
    showTaxRows && saleOrder.totals.total_addl_cess_amt > 0
      ? ["Additional Cess", saleOrder.totals.total_addl_cess_amt]
      : null,
  ]
    .filter(
      (row): row is [string, number] =>
        Array.isArray(row) && typeof row[1] === "number",
    )
    .map(([label, value]) => ({
      label,
      value: formatAmount(value),
    }));

  return {
    company: {
      name: company.name || "Company",
      logo: getSafeImageUrl(company.logo),
      detailLines: getCompanyDetailLines(company),
    },
    title: "SALE ORDER",
    orderNumber: saleOrder.voucher_number || "--",
    date: formatDate(saleOrder.date),
    customer: {
      name: party.name,
      billingAddress: party.billing_address || "",
      gstLine: party.gst_no ? `GSTIN: ${party.gst_no}` : undefined,
      mobileLine: party.mobile ? `Mobile: ${party.mobile}` : undefined,
    },
    productRows,
    subtotal: formatAmount(saleOrder.totals.sub_total),
    additionalChargeRows,
    additionalChargeTotal: formatAmount(
      saleOrder.totals.total_additional_charge,
    ),
    summaryRows,
    grandTotal: formatAmount(saleOrder.totals.final_amount),
    footerText: "Thank You",
  };
}
