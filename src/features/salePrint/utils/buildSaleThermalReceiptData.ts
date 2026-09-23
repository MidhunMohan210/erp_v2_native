import type { Company } from "@/types/company";
import type { VoucherPrintConfig } from "@/types/printConfiguration";
import type { PrintableSaleDocument } from "@/types/saleOrder";
import { getPrintableBatchLabel } from "@/features/saleOrderPrint/utils/getPrintableBatchLabel";

export type SaleThermalReceiptData = {
  company: { name: string; detailLines: string[] };
  title: string;
  orderNumber: string;
  date: string;
  customer: { name?: string | null; billingAddress: string };
  productRows: {
    number: string;
    name: string;
    batchLabel?: string;
    taxRate: string;
    mrp: string;
    rate: string;
    quantity: string;
    total: string;
  }[];
  additionalChargeRows: {
    option: string;
    actionSymbol: string;
    finalValue: string;
  }[];
  additionalChargeTotal: string;
  totalQuantity: string;
  subTotal: string;
  mrpTotal: string;
  roundOff: string;
  grandTotal: string;
  footerText: string;
};

type BuildSaleThermalReceiptDataParams = {
  sale: PrintableSaleDocument;
  company: Company;
  configuration: VoucherPrintConfig;
};

function formatAmount(value?: number | null): string {
  return Number(value ?? 0).toFixed(2);
}

function formatQuantity(value?: number | null): string {
  const quantity = Number(value ?? 0);
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
}

function formatTaxRate(value?: number | null): string {
  const rate = Number(value ?? 0);
  return `${Number.isInteger(rate) ? rate : rate.toFixed(2)}%`;
}

function formatDate(value?: string): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function getCompanyDetailLines(company: Company): string[] {
  const address = [
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

  return [
    address,
    company.gstNum ? `GSTIN: ${company.gstNum}` : "",
    company.pan ? `PAN: ${company.pan}` : "",
    company.mobile ? `Mobile: ${company.mobile}` : "",
  ].filter(Boolean);
}

function formatRoundOff(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatAmount(Math.abs(value))}`;
}

export function buildSaleThermalReceiptData({
  sale,
  company,
  configuration,
}: BuildSaleThermalReceiptDataParams): SaleThermalReceiptData {
  const totalQuantity = sale.items.reduce(
    (total, item) => total + Number(item.billed_qty ?? 0),
    0,
  );
  const mrpTotal = sale.items.reduce((total, item) => {
    if (typeof item.mrp !== "number") return total;
    return total + item.mrp * Number(item.billed_qty ?? 0);
  }, 0);

  // This is display-only rounding. The saved Sale total stays unchanged.
  const actualFinalAmount = Number(sale.totals.final_amount ?? 0);
  const roundedGrandTotal = Math.round(actualFinalAmount);
  const roundOff = Math.round((roundedGrandTotal - actualFinalAmount) * 100) / 100;

  return {
    company: {
      name: company.name || "Company",
      detailLines: getCompanyDetailLines(company),
    },
    title: (configuration.print_title || "Sale").toUpperCase(),
    orderNumber: sale.voucher_number || "--",
    date: formatDate(sale.date),
    customer: {
      name: sale.party_snapshot.name,
      billingAddress: sale.party_snapshot.billing_address || "",
    },
    productRows: sale.items.map((item, index) => ({
      number: String(index + 1),
      name: item.item_name || "--",
      batchLabel: getPrintableBatchLabel(item.batch) ?? undefined,
      taxRate: formatTaxRate(item.tax_rate),
      mrp: typeof item.mrp === "number" ? formatAmount(item.mrp) : "-",
      rate: formatAmount(item.rate),
      quantity: formatQuantity(item.billed_qty),
      total: formatAmount(item.total_amount),
    })),
    additionalChargeRows: sale.additional_charges.map((charge) => ({
      option: charge.option || "Additional Charge",
      actionSymbol: charge.action === "subtract" ? "-" : "+",
      finalValue: formatAmount(charge.final_value),
    })),
    additionalChargeTotal: formatAmount(sale.totals.total_additional_charge),
    totalQuantity: formatQuantity(totalQuantity),
    // item_total is the saved total of item lines before additional charges.
    subTotal: formatAmount(sale.totals.item_total),
    mrpTotal: formatAmount(mrpTotal),
    roundOff: formatRoundOff(roundOff),
    grandTotal: formatAmount(roundedGrandTotal),
    footerText: "Thank You",
  };
}
