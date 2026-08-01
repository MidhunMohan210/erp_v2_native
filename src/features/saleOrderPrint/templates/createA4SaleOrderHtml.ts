import type { Company } from "@/types/company";
import type { CompanySettings } from "@/types/companySettings";
import type { SaleOrderPrintConfig } from "@/types/printConfiguration";
import type { SaleOrderDetail, SaleOrderDetailItem } from "@/types/saleOrder";

type CreateA4SaleOrderHtmlParams = {
  saleOrder: SaleOrderDetail;
  company: Company;
  configuration: SaleOrderPrintConfig;
  companySettings?: CompanySettings;
};

type ResolvedPrintConfiguration = {
  printTitle: string;
  showPrintTitle: boolean;
  showCompanyDetails: boolean;
  showDiscountColumn: boolean;
  showHsn: boolean;
  showTaxPercentage: boolean;
  showStockWiseTaxAmount: boolean;
  showTaxAmount: boolean;
  showTermsAndConditions: boolean;
  showBankDetails: boolean;
  showRate: boolean;
  showQuantity: boolean;
  showStockWiseAmount: boolean;
  showNetAmount: boolean;
};

type ItemColumn = {
  key: string;
  label: string;
  align: "left" | "center" | "right";
  value: (item: SaleOrderDetailItem, index: number) => string;
  footerValue?: string;
};

type SummaryRow = {
  label: string;
  value: string;
  strong?: boolean;
};

// Every API value passes through this helper before entering the HTML document.
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeImageUrl(value?: string): string {
  if (!value) return "";
  return /^(https?:\/\/|data:image\/)/i.test(value) ? escapeHtml(value) : "";
}

function formatDate(value?: string): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function formatAmount(value?: number | null): string {
  return Number(value ?? 0).toFixed(2);
}

function formatCompactNumber(value?: number | null): string {
  const number = Number(value ?? 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function resolveConfiguration(
  configuration: SaleOrderPrintConfig,
): ResolvedPrintConfiguration {
  return {
    printTitle: configuration.print_title || "Sale Order",
    showPrintTitle: configuration.show_print_title ?? true,
    showCompanyDetails: configuration.enable_company_details ?? true,
    showDiscountColumn: configuration.enable_discount_column ?? true,
    showHsn: configuration.enable_hsn ?? true,
    showTaxPercentage: configuration.enable_tax_percentage ?? true,
    showStockWiseTaxAmount: configuration.enable_stock_wise_tax_amount ?? true,
    showTaxAmount: configuration.enable_tax_amount ?? true,
    showTermsAndConditions: configuration.enable_terms_conditions ?? true,
    showBankDetails: configuration.enable_bank_details ?? false,
    showRate: configuration.enable_rate ?? true,
    showQuantity: configuration.enable_quantity ?? true,
    showStockWiseAmount: configuration.enable_stock_wise_amount ?? true,
    showNetAmount: configuration.enable_net_amount ?? true,
  };
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

function createLines(values: (string | null | undefined)[]): string {
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => `<div>${escapeHtml(value)}</div>`)
    .join("");
}

function integerToWords(value: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const belowThousand = (number: number): string => {
    if (number === 0) return "";
    if (number < 20) return ones[number];
    if (number < 100) {
      const remainder = number % 10;
      return `${tens[Math.floor(number / 10)]}${
        remainder ? ` ${ones[remainder]}` : ""
      }`;
    }

    const remainder = number % 100;
    return `${ones[Math.floor(number / 100)]} Hundred${
      remainder ? ` ${belowThousand(remainder)}` : ""
    }`;
  };

  if (!value) return "Zero";

  const parts: string[] = [];
  const crores = Math.floor(value / 10_000_000);
  const lakhs = Math.floor((value % 10_000_000) / 100_000);
  const thousands = Math.floor((value % 100_000) / 1_000);
  const hundreds = value % 1_000;

  if (crores) parts.push(`${belowThousand(crores)} Crore`);
  if (lakhs) parts.push(`${belowThousand(lakhs)} Lakh`);
  if (thousands) parts.push(`${belowThousand(thousands)} Thousand`);
  if (hundreds) parts.push(belowThousand(hundreds));

  return parts.join(" ");
}

// This copies the web print formatter and reads only the API final amount.
function amountToWords(value: number): string {
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  const paiseText = paise ? ` and ${integerToWords(paise)} Paise` : "";
  return `${integerToWords(rupees)} Rupees${paiseText} Only`;
}

function buildItemColumns(
  saleOrder: SaleOrderDetail,
  configuration: ResolvedPrintConfiguration,
): ItemColumn[] {
  const columns: (ItemColumn | null)[] = [
    {
      key: "number",
      label: "No",
      align: "center",
      value: (_item, index) => String(index + 1),
    },
    {
      key: "item",
      label: "Item",
      align: "left",
      value: (item) => item.item_name || "--",
      footerValue: "Subtotal",
    },
    configuration.showHsn
      ? {
          key: "hsn",
          label: "HSN",
          align: "center",
          value: (item) => item.hsn || "--",
        }
      : null,
    configuration.showTaxPercentage
      ? {
          key: "taxRate",
          label: "Tax %",
          align: "right",
          value: (item) => formatCompactNumber(item.tax_rate),
        }
      : null,
    configuration.showTaxPercentage
      ? {
          key: "cessRate",
          label: "Cess %",
          align: "right",
          value: (item) => formatCompactNumber(item.cess_rate),
        }
      : null,
    configuration.showTaxPercentage
      ? {
          key: "additionalCessRate",
          label: "Addl Cess",
          align: "right",
          value: (item) => formatCompactNumber(item.addl_cess_rate),
        }
      : null,
    configuration.showQuantity
      ? {
          key: "quantity",
          label: "Qty",
          align: "center",
          value: (item) =>
            `${formatCompactNumber(item.billed_qty)} ${item.unit ?? ""}`.trim(),
        }
      : null,
    configuration.showRate
      ? {
          key: "rate",
          label: "Rate",
          align: "right",
          value: (item) => formatAmount(item.rate),
        }
      : null,
    configuration.showDiscountColumn
      ? {
          key: "discount",
          label: "Disc",
          align: "right",
          value: (item) => formatAmount(item.discount_amount),
        }
      : null,
    configuration.showStockWiseAmount
      ? {
          key: "amount",
          label: "Amt",
          align: "right",
          value: (item) => formatAmount(item.taxable_amount),
          footerValue: formatAmount(saleOrder.totals.taxable_amount),
        }
      : null,
    configuration.showStockWiseTaxAmount
      ? {
          key: "taxAmount",
          label: "Tax Amt",
          align: "right",
          value: (item) => formatAmount(item.tax_amount),
          footerValue: formatAmount(saleOrder.totals.total_tax_amount),
        }
      : null,
    configuration.showStockWiseTaxAmount
      ? {
          key: "cessAmount",
          label: "Cess Amt",
          align: "right",
          value: (item) => formatAmount(item.cess_amount),
          footerValue: formatAmount(saleOrder.totals.total_cess_amt),
        }
      : null,
    configuration.showStockWiseTaxAmount
      ? {
          key: "additionalCessAmount",
          label: "Addl Amt",
          align: "right",
          value: (item) => formatAmount(item.addl_cess_amount),
          footerValue: formatAmount(saleOrder.totals.total_addl_cess_amt),
        }
      : null,
    configuration.showNetAmount
      ? {
          key: "netAmount",
          label: "Net Amt",
          align: "right",
          value: (item) => formatAmount(item.total_amount),
          // Item total excludes additional charges, which have their own table total.
          footerValue: formatAmount(saleOrder.totals.item_total),
        }
      : null,
  ];

  return columns.filter((column): column is ItemColumn => column !== null);
}

function createItemsTable(
  saleOrder: SaleOrderDetail,
  configuration: ResolvedPrintConfiguration,
): string {
  const columns = buildItemColumns(saleOrder, configuration);
  const headers = columns
    .map(
      (column) =>
        `<th class="align-${column.align}">${escapeHtml(column.label)}</th>`,
    )
    .join("");
  const rows = saleOrder.items
    .map(
      (item, index) => `
        <tr>
          ${columns
            .map(
              (column) =>
                `<td class="align-${column.align}">${escapeHtml(
                  column.value(item, index),
                )}</td>`,
            )
            .join("")}
        </tr>`,
    )
    .join("");
  const footer = columns
    .map(
      (column) =>
        `<td class="align-${column.align}">${escapeHtml(
          column.footerValue ?? "",
        )}</td>`,
    )
    .join("");

  return `
    <section class="document-section items-section">
      <table class="items-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>${footer}</tr></tfoot>
      </table>
    </section>`;
}

function createAdditionalCharges(saleOrder: SaleOrderDetail): string {
  if (saleOrder.additional_charges.length === 0) return "";

  const getActionSymbol = (action: SaleOrderDetailCharge["action"]): string =>
    action === "subtract" ? "-" : "+";

  const rows = saleOrder.additional_charges
    .map(
      (charge) => `
        <tr>
          <td >${escapeHtml(charge.option || "Additional Charge")}</td>
          <td class="align-center">${getActionSymbol(charge.action)}</td>
          <td class="align-center">${escapeHtml(charge.hsn || "--")}</td>
          <td class="align-right">${escapeHtml(formatAmount(charge.value))}</td>
          <td class="align-right">${escapeHtml(
            formatAmount(charge.tax_amount),
          )}</td>
          <td class="align-right">${escapeHtml(
            formatAmount(charge.final_value),
          )}</td>
        </tr>`,
    )
    .join("");

  return `
    <section class="document-section avoid-break">
      <h2>Additional Charges</h2>
      <table>
        <thead>
          <tr>
            <th class="align-left">Item</th>
            <th class="align-center">Action</th>
            <th class="align-center">HSN</th>
            <th class="align-right">Amount</th>
            <th class="align-right">Tax</th>
            <th class="align-right">Net Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="align-right">Total</td>
            <td class="align-right">${escapeHtml(
              formatAmount(saleOrder.totals.total_additional_charge),
            )}</td>
          </tr>
        </tfoot>
      </table>
    </section>`;
}

function buildSummaryRows(
  saleOrder: SaleOrderDetail,
  configuration: ResolvedPrintConfiguration,
): SummaryRow[] {
  const totals = saleOrder.totals;
  const rows: SummaryRow[] = [
    { label: "Product Total", value: formatAmount(totals.sub_total) },
  ];

  if (totals.total_additional_charge) {
    rows.push({
      label: "Additional Charges",
      value: formatAmount(totals.total_additional_charge),
    });
  }

  if (totals.total_discount) {
    rows.push({
      label: "Discount",
      value: formatAmount(totals.total_discount),
    });
  }

  // rows.push({
  //   label: "Taxable Amount",
  //   value: formatAmount(totals.taxable_amount),
  // });

  if (configuration.showTaxAmount) {
    rows.push({
      label: "Total Tax",
      value: formatAmount(totals.total_tax_amount),
    });
    if (totals.total_igst_amt) {
      rows.push({ label: "IGST", value: formatAmount(totals.total_igst_amt) });
    }
    if (totals.total_cgst_amt) {
      rows.push({ label: "CGST", value: formatAmount(totals.total_cgst_amt) });
    }
    if (totals.total_sgst_amt) {
      rows.push({ label: "SGST", value: formatAmount(totals.total_sgst_amt) });
    }
    if (totals.total_cess_amt) {
      rows.push({ label: "Cess", value: formatAmount(totals.total_cess_amt) });
    }
    if (totals.total_addl_cess_amt) {
      rows.push({
        label: "Additional Cess",
        value: formatAmount(totals.total_addl_cess_amt),
      });
    }
  }

  if (totals.round_off) {
    rows.push({ label: "Round Off", value: formatAmount(totals.round_off) });
  }
  if (configuration.showNetAmount) {
    rows.push({
      label: "Grand Total",
      value: formatAmount(totals.final_amount),
      strong: true,
    });
  }

  return rows;
}

function createTotals(
  saleOrder: SaleOrderDetail,
  configuration: ResolvedPrintConfiguration,
): string {
  const rows = buildSummaryRows(saleOrder, configuration)
    .map(
      (row) => `
        <div class="summary-row${row.strong ? " grand-total" : ""}">
          <span>${escapeHtml(row.label)}</span>
          <span>${escapeHtml(row.value)}</span>
        </div>`,
    )
    .join("");
  const amountWords = configuration.showNetAmount
    ? `
      <div class="amount-words">
        <strong>Net Amount (in words):</strong>
        ${escapeHtml(
          amountToWords(saleOrder.totals.final_amount).toUpperCase(),
        )}
      </div>`
    : "";

  return `
    <section class="document-section totals-section avoid-break">
      <div class="summary-panel">${rows}</div>
      ${amountWords}
    </section>`;
}

function createTerms(
  companySettings: CompanySettings | undefined,
  configuration: ResolvedPrintConfiguration,
): string {
  const terms =
    companySettings?.dataEntry?.order?.termsAndConditions?.filter(Boolean) ??
    [];
  if (!configuration.showTermsAndConditions || terms.length === 0) return "";

  return `
    <section class="document-section avoid-break">
      <h2>Terms &amp; Conditions</h2>
      <ol class="terms-list">
        ${terms.map((term) => `<li>${escapeHtml(term)}</li>`).join("")}
      </ol>
    </section>`;
}

function createBankDetails(
  companySettings: CompanySettings | undefined,
  configuration: ResolvedPrintConfiguration,
): string {
  const bank =
    companySettings?.dataEntry?.voucher?.defaultBankAccountId ?? null;
  if (!configuration.showBankDetails || !bank) return "";

  const lines = [
    bank.partyName && bank.bank_name
      ? `Bank Name: ${bank.partyName} (${bank.bank_name})`
      : bank.bank_name
        ? `Bank Name: ${bank.bank_name}`
        : null,
    bank.ifsc ? `IFSC Code: ${bank.ifsc}` : null,
    bank.ac_no ? `Account Number: ${bank.ac_no}` : null,
    bank.branch ? `Branch: ${bank.branch}` : null,
  ];

  return `
    <div class="bank-details">
      <h2>Bank Details</h2>
      ${createLines(lines)}
    </div>`;
}

export function createA4SaleOrderHtml({
  saleOrder,
  company,
  configuration,
  companySettings,
}: CreateA4SaleOrderHtmlParams): string {
  const resolved = resolveConfiguration(configuration);
  const companyAddress = getCompanyAddress(company);
  const companyLogo = safeImageUrl(company.logo);
  const party = saleOrder.party_snapshot;
  const despatchRows = [
    ["Challan No", saleOrder.despatch_details.challan_no],
    ["Container No", saleOrder.despatch_details.container_no],
    ["Despatch Through", saleOrder.despatch_details.despatch_through],
    ["Destination", saleOrder.despatch_details.destination],
    ["Vehicle No", saleOrder.despatch_details.vehicle_no],
    ["Order No", saleOrder.despatch_details.order_no],
    ["Terms Of Pay", saleOrder.despatch_details.terms_of_pay],
    ["Terms Of Delivery", saleOrder.despatch_details.terms_of_delivery],
  ].filter((row) => Boolean(row[1]));
  const despatchSection =
    despatchRows.length > 0
      ? `
        <section class="document-section avoid-break">
          <h2>Despatch Details</h2>
          <div class="details-grid">
            ${despatchRows
              .map(
                ([label, value]) => `
                  <div class="detail-entry">
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </div>`,
              )
              .join("")}
          </div>
        </section>`
      : "";
  const companyBlock = resolved.showCompanyDetails
    ? `
      <div class="company-block">
        ${
          companyLogo
            ? `<img class="company-logo" src="${companyLogo}" alt="Company logo" />`
            : ""
        }
        <div>
          <h1>${escapeHtml(company.name || "Company")}</h1>
          ${createLines([
            companyAddress,
            company.gstNum ? `GST: ${company.gstNum}` : null,
            company.pan ? `PAN: ${company.pan}` : null,
            company.mobile ? `Mobile: ${company.mobile}` : null,
            company.email ? `Email: ${company.email}` : null,
          ])}
        </div>
      </div>`
    : "<div></div>";
  const narration = saleOrder.narration
    ? `
      <section class="document-section avoid-break">
        <h2>Notes</h2>
        <p class="wrapped-text">${escapeHtml(saleOrder.narration)}</p>
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page {
        size: A4 portrait;
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        width: 210mm;
        min-height: 297mm;
        background: #ffffff;
        color: #1f2937;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 9px;
        line-height: 1.45;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .a4-page {
        width: 210mm;
        min-height: 297mm;
        margin: 0;
        padding: 14mm;
        overflow: visible;
        background: #ffffff;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        color: #0f172a;
        font-size: 14px;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }

      h2 {
        margin-bottom: 7px;
        color: #0f172a;
        font-size: 10px;
      }

      .document-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 54mm;
        gap: 10mm;
        padding-bottom: 9px;
        border-bottom: 1px solid #e2e8f0;
        break-inside: avoid;
      }

      .company-block {
        display: flex;
        min-width: 0;
        gap: 8px;
        color: #475569;
      }

      .company-logo {
        width: 18mm;
        height: 18mm;
        flex: 0 0 auto;
        object-fit: contain;
      }

      .order-meta {
        text-align: right;
      }

      .print-title {
        margin-bottom: 5px;
        color: #0f172a;
        font-size: 17px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .order-number {
        color: #0f172a;
        font-size: 10px;
        font-weight: 700;
      }

      .muted {
        color: #64748b;
      }

      .party-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8mm;
      }

      .party-column {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .party-column strong {
        display: block;
        margin-bottom: 4px;
        color: #0f172a;
        font-size: 10px;
      }

      .document-section {
        margin-top: 9px;
        padding-top: 9px;
        border-top: 1px solid #e2e8f0;
      }

      .party-section {
        border-top: 0;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px 12px;
      }

      .detail-entry {
        min-width: 0;
      }

      .detail-entry span {
        display: block;
        color: #64748b;
        font-size: 8px;
      }

      .detail-entry strong {
        display: block;
        margin-top: 2px;
        color: #1f2937;
        overflow-wrap: anywhere;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      th,
      td {
        padding: 4px 3px;
        border: 1px solid #e2e8f0;
        vertical-align: top;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      th {
        background: #f5f7fa;
        color: #0f172a;
        font-size: 7px;
        font-weight: 700;
      }

      td {
        font-size: 7.2px;
      }

      tfoot td {
        background: #f1f5f9;
        color: #0f172a;
        font-weight: 700;
      }

      .align-left {
        text-align: left;
      }

      .align-center {
        text-align: center;
      }

      .align-right {
        text-align: right;
      }

      .summary-panel {
        width: 62mm;
        max-width: 100%;
        margin-left: auto;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 2px 0;
        color: #64748b;
      }

      .summary-row span:last-child {
        color: #0f172a;
        text-align: right;
      }

      .grand-total {
        margin-top: 3px;
        padding-top: 5px;
        border-top: 1px solid #cbd5e1;
        color: #0f172a;
        font-size: 11px;
        font-weight: 700;
      }

      .amount-words {
        margin-top: 8px;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .wrapped-text {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .terms-list {
        margin: 0;
        padding-left: 16px;
        color: #475569;
      }

      .terms-list li {
        margin-bottom: 3px;
        overflow-wrap: anywhere;
      }

      .document-footer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 12mm;
        min-height: 34mm;
        margin-top: 12px;
        padding-top: 9px;
        border-top: 1px solid #e2e8f0;
      }

      .bank-details {
        color: #475569;
        overflow-wrap: anywhere;
      }

      .signature {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-width: 0;
        text-align: right;
      }

      .signature strong {
        color: #0f172a;
        overflow-wrap: anywhere;
      }

      .avoid-break,
      .totals-section,
      .document-footer {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }

      tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      @media print {
        html,
        body {
          background: #ffffff;
        }

        .a4-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 14mm;
          overflow: visible;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <article class="a4-page">
        <header class="document-header">
          ${companyBlock}
          <div class="order-meta">
            ${
              resolved.showPrintTitle
                ? `<div class="print-title">${escapeHtml(
                    resolved.printTitle,
                  )}</div>`
                : ""
            }
            <div class="order-number">
              Order No: ${escapeHtml(saleOrder.voucher_number || "--")}
            </div>
            <div class="muted">Date: ${escapeHtml(
              formatDate(saleOrder.date),
            )}</div>
          </div>
        </header>

        <section class="document-section party-section avoid-break">
          <div class="party-grid">
            <div class="party-column">
              <strong>Bill To</strong>
              ${createLines([
                party.name,
                party.billing_address,
                party.gst_no ? `GST: ${party.gst_no}` : null,
                party.mobile ? `Mobile: ${party.mobile}` : null,
              ])}
            </div>
            <div class="party-column">
              <strong>Ship To</strong>
              ${createLines([
                party.name,
                party.shipping_address || party.billing_address,
                party.state ? `State: ${party.state}` : null,
              ])}
            </div>
          </div>
        </section>

        ${despatchSection}
        ${createItemsTable(saleOrder, resolved)}
        ${createAdditionalCharges(saleOrder)}
        ${createTotals(saleOrder, resolved)}
        ${narration}
        ${createTerms(companySettings, resolved)}

        <footer class="document-footer">
          ${createBankDetails(companySettings, resolved)}
          <div class="signature">
            <strong>${escapeHtml(company.name || "Company")}</strong>
            <strong>Authorized Signatory</strong>
          </div>
        </footer>
      </article>
    </main>
  </body>
</html>`;
}
