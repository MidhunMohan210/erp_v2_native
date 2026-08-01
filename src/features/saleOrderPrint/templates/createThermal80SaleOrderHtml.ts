import type { Company } from "@/types/company";
import type { SaleOrderPrintConfig } from "@/types/printConfiguration";
import type { SaleOrderDetail } from "@/types/saleOrder";

type CreateThermal80SaleOrderHtmlParams = {
  saleOrder: SaleOrderDetail;
  company: Company;
  configuration: SaleOrderPrintConfig;
};

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

function createCentredLines(values: (string | null | undefined)[]): string {
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => `<div>${escapeHtml(value)}</div>`)
    .join("");
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

export function createThermal80SaleOrderHtml({
  saleOrder,
  company,
  configuration,
}: CreateThermal80SaleOrderHtmlParams): string {
  const party = saleOrder.party_snapshot;
  const companyLogo = safeImageUrl(company.logo);
  const billingAddress = party.billing_address || "";
  const showTaxRows = configuration.enable_tax_amount ?? true;
  const productRows = saleOrder.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.item_name || "--")}</td>
          <td class="number">${escapeHtml(formatAmount(item.billed_qty))}</td>
          <td class="number">${escapeHtml(formatAmount(item.rate))}</td>
          <td class="number">${escapeHtml(formatAmount(item.total_amount))}</td>
        </tr>`,
    )
    .join("");
  const additionalChargeRows = saleOrder.additional_charges
    .map(
      (charge) => `
        <tr>
          <td>${escapeHtml(charge.option || "Additional Charge")}</td>
          <td class="action">${charge.action === "subtract" ? "-" : "+"}</td>
          <td class="number">${escapeHtml(formatAmount(charge.final_value))}</td>
        </tr>`,
    )
    .join("");
  const additionalChargesSection = saleOrder.additional_charges.length
    ? `
      <section class="section additional-charges">
        <div class="section-title">ADDITIONAL CHARGES</div>
        <table class="charges-table">
          <tbody>
            ${additionalChargeRows}
            <tr class="total-row">
              <td colspan="2">Additional Charges Total</td>
              <td class="number">${escapeHtml(
                formatAmount(saleOrder.totals.total_additional_charge),
              )}</td>
            </tr>
          </tbody>
        </table>
      </section>`
    : "";
  const summaryRows = [
    ["Taxable Value", saleOrder.totals.taxable_amount],
    saleOrder.totals.total_discount > 0
      ? ["Discount", saleOrder.totals.total_discount]
      : null,
    showTaxRows ? ["Tax Amount", saleOrder.totals.total_tax_amount] : null,
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
    ["Product Total", saleOrder.totals.item_total],
  ]
    .filter(
      (row): row is [string, number] =>
        Array.isArray(row) && typeof row[1] === "number",
    )
    .map(
      ([label, value]) => `
        <div class="summary-row">
          <span>${escapeHtml(label)}</span>
          <span>${escapeHtml(formatAmount(value))}</span>
        </div>`,
    )
    .join("");
  const customerSection = `
    <section class="customer-section">
      <div class="section-title">BILL TO</div>
      ${createCentredLines([
        party.name,
        billingAddress,
        party.gst_no ? `GSTIN: ${party.gst_no}` : null,
        party.mobile ? `Mobile: ${party.mobile}` : null,
      ])}
    </section>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { size: 80mm 297mm; margin: 0; }
      * { box-sizing: border-box; }
      html, body {
        width: 80mm;
        margin: 0;
        background: #ffffff;
        color: #000000;
        font-family: "Courier New", Courier, monospace;
        font-size: 9px;
        line-height: 1.35;
      }
      .thermal-page { width: 80mm; min-height: 297mm; padding: 4mm; }
      .header, .customer-section, .thank-you { text-align: center; }
      .logo { display: block; width: auto; max-width: 32mm; height: auto; max-height: 18mm; margin: 0 auto 2mm; object-fit: contain; }
      .company-name { font-size: 13px; font-weight: 700; }
      .muted { font-size: 8px; }
      .document-title { margin-top: 3mm; font-size: 12px; font-weight: 700; }
      .separator { margin: 2.5mm 0; border-top: 1px dashed #000000; }
      .section { margin-top: 3mm; break-inside: avoid; page-break-inside: avoid; }
      .section-title { margin-bottom: 1.5mm; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { padding: 1.2mm 0.6mm; vertical-align: top; overflow-wrap: anywhere; }
      .items-table { border-top: 1px dashed #000000; border-bottom: 1px dashed #000000; }
      .items-table th { border-bottom: 1px dashed #000000; text-align: left; }
      .items-table th:first-child { width: 52%; }
      .items-table th:nth-child(2) { width: 12%; }
      .items-table th:nth-child(3) { width: 17%; }
      .items-table th:nth-child(4) { width: 19%; }
      .number { text-align: right; white-space: nowrap; }
      .action { width: 8mm; text-align: center; }
      .total-row td { border-top: 1px dashed #000000; font-weight: 700; }
      .summary { margin-top: 3mm; padding-top: 2mm; border-top: 1px dashed #000000; }
      .summary-row { display: flex; justify-content: space-between; gap: 4mm; padding: 0.5mm 0; }
      .summary-row span:last-child { text-align: right; white-space: nowrap; }
      .grand-total { margin-top: 3mm; padding: 2mm 0; border-top: 2px double #000000; border-bottom: 2px double #000000; display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }
      .thank-you { margin-top: 3mm; padding-top: 2mm; border-top: 1px dashed #000000; font-weight: 700; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <main class="thermal-page">
      <header class="header">
        ${companyLogo ? `<img class="logo" src="${companyLogo}" alt="Company logo" />` : ""}
        <div class="company-name">${escapeHtml(company.name || "Company")}</div>
        <div class="muted">${createCentredLines([
          getCompanyAddress(company),
          company.gstNum ? `GSTIN: ${company.gstNum}` : null,
          company.pan ? `PAN: ${company.pan}` : null,
          company.mobile ? `Mobile: ${company.mobile}` : null,
          company.email ? `Email: ${company.email}` : null,
        ])}</div>
        <div class="document-title">SALE ORDER</div>
        <div>Order No: ${escapeHtml(saleOrder.voucher_number || "--")}</div>
        <div>Date: ${escapeHtml(formatDate(saleOrder.date))}</div>
      </header>

      <div class="separator"></div>
      ${customerSection}
      <div class="separator"></div>

      <section class="section">
        <table class="items-table">
          <thead><tr><th>Product</th><th class="number">Qty</th><th class="number">Rate</th><th class="number">Amount</th></tr></thead>
          <tbody>${productRows}</tbody>
        </table>
      </section>

      ${additionalChargesSection}

      <section class="summary">
        ${summaryRows}
      </section>

      <div class="grand-total"><span>GRAND TOTAL</span><span>${escapeHtml(
        formatAmount(saleOrder.totals.final_amount),
      )}</span></div>

      <div class="thank-you">Thank You</div>
    </main>
  </body>
</html>`;
}
