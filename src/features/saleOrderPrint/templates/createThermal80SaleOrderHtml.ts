import type { Company } from "@/types/company";
import type { SaleOrderPrintConfig } from "@/types/printConfiguration";
import type { SaleOrderDetail } from "@/types/saleOrder";
import { buildSaleOrderThermalReceiptData } from "@/features/saleOrderPrint/utils/buildSaleOrderThermalReceiptData";

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

function createCentredLines(values: (string | null | undefined)[]): string {
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => `<div>${escapeHtml(value)}</div>`)
    .join("");
}

function createCompactOrderNumber(value: string): string {
  return value.replace(/\s*\/\s*/g, "/").trim();
}

export function createThermal80SaleOrderHtml({
  saleOrder,
  company,
  configuration,
}: CreateThermal80SaleOrderHtmlParams): string {
  const receipt = buildSaleOrderThermalReceiptData({
    saleOrder,
    company,
    configuration,
  });
  const compactOrderNumber = createCompactOrderNumber(receipt.orderNumber);
  const productRows = receipt.productRows
    .map(
      (row) => `
        <tbody class="product-row-group">
          <tr class="product-name-row">
            <td colspan="3">${escapeHtml(row.name)}</td>
          </tr>
          <tr class="product-number-row">
            <td class="number">${escapeHtml(row.quantity)}</td>
            <td class="number">${escapeHtml(row.rate)}</td>
            <td class="number">${escapeHtml(row.taxableAmount)}</td>
          </tr>
        </tbody>`,
    )
    .join("");
  const additionalChargeRows = receipt.additionalChargeRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.option)}</td>
          <td class="action">${escapeHtml(row.actionSymbol)}</td>
          <td class="number">${escapeHtml(row.finalValue)}</td>
        </tr>`,
    )
    .join("");
  const additionalChargesSection = receipt.additionalChargeRows.length
    ? `
      <section class="section additional-charges">
        <div class="section-title">ADDITIONAL CHARGES</div>
        <table class="charges-table">
          <tbody>
            ${additionalChargeRows}
            <tr class="total-row">
              <td colspan="2">Total Additional Charges</td>
              <td class="number">${escapeHtml(receipt.additionalChargeTotal)}</td>
            </tr>
          </tbody>
        </table>
      </section>`
    : "";
  const summaryRows = receipt.summaryRows
    .map(
      (row) => `
        <div class="summary-row">
          <span>${escapeHtml(row.label)}</span>
          <span>${escapeHtml(row.value)}</span>
        </div>`,
    )
    .join("");
  const orderCustomerSection = `
    <section class="order-customer-section">
      <div class="bill-to">
        <div class="section-title">BILL TO</div>
        ${createCentredLines([
          receipt.customer.name,
          receipt.customer.billingAddress,
          receipt.customer.gstLine,
          receipt.customer.mobileLine,
        ])}
      </div>
      <div class="order-meta">
        <div>No: ${escapeHtml(compactOrderNumber)}</div>
        <div>Date: ${escapeHtml(receipt.date)}</div>
      </div>
    </section>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { size: 80mm 210mm; margin: 4mm 0 0; }
      @page:first { margin: 0; }
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
      .thermal-page { width: 80mm; padding: 3mm; }
      .header, .thank-you { text-align: center; }
      .company-header { text-align: center; overflow-wrap: anywhere; }
      .company-details { min-width: 0; }
      .company-name { font-size: 12px; font-weight: 700; }
      .muted { font-size: 8px; }
      .document-title { margin-top: 2.5mm; font-size: 11px; font-weight: 700; }
      .separator { margin: 1.5mm 0; border-top: 1px dashed #000000; }
      .section { margin-top: 2mm; }
      .order-customer-section { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5mm; font-size: 8px; line-height: 1.2; }
      .bill-to { flex: 1; min-width: 0; text-align: left; overflow-wrap: anywhere; }
      .order-meta { flex: 0 0 40%; text-align: right; overflow-wrap: anywhere; }
      .additional-charges { break-inside: avoid; page-break-inside: avoid; }
      .section-title { margin-bottom: 1mm; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { padding: 0.8mm 0.5mm; vertical-align: top; overflow-wrap: anywhere; }
      .items-table { border-top: 1px dashed #000000; border-bottom: 1px dashed #000000; }
      .items-table th { border-bottom: 1px dashed #000000; text-align: left; }
      .items-table th.number { text-align: right; }
      .qty-column { width: 32%; }
      .rate-column { width: 34%; }
      .amount-column { width: 34%; }
      .product-name-row td { padding-top: 1.1mm; padding-bottom: 0.2mm; text-align: left; }
      .product-number-row td { padding-top: 0.2mm; padding-bottom: 1.1mm; }
      .product-row-group { break-inside: avoid; page-break-inside: avoid; }
      .number { text-align: right; white-space: nowrap; }
      .action { width: 8mm; text-align: center; }
      .total-row td { border-top: 1px dashed #000000; font-weight: 700; }
      .summary { margin-top: 2mm; padding-top: 1mm; border-top: 1px dashed #000000; }
      .summary-row { display: flex; justify-content: space-between; gap: 4mm; padding: 0.25mm 0; }
      .summary-row span:last-child { text-align: right; white-space: nowrap; }
      .grand-total { margin-top: 2mm; padding: 1.5mm 0; border-top: 2px double #000000; border-bottom: 2px double #000000; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
      .thank-you { margin-top: 2mm; padding-top: 1mm; border-top: 1px dashed #000000; font-weight: 700; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <main class="thermal-page">
      <header class="header">
        <div class="company-header">
          <div class="company-details">
            <div class="company-name">${escapeHtml(receipt.company.name)}</div>
            <div class="muted">${createCentredLines(receipt.company.detailLines)}</div>
          </div>
        </div>
        <div class="document-title">${escapeHtml(receipt.title)}</div>
      </header>

      <div class="separator"></div>
      ${orderCustomerSection}

      <section class="section">
        <table class="items-table">
          <colgroup>
            <col class="qty-column" />
            <col class="rate-column" />
            <col class="amount-column" />
          </colgroup>
          <thead>
            <tr><th colspan="3">Product</th></tr>
            <tr><th class="number">Qty</th><th class="number">Rate</th><th class="number">Amount</th></tr>
          </thead>
          ${productRows}
          <tbody>
            <tr class="total-row">
              <td colspan="2">Total</td>
              <td class="number">${escapeHtml(receipt.subtotal)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      ${additionalChargesSection}

      <section class="summary">
        ${summaryRows}
      </section>

      <div class="grand-total"><span>GRAND TOTAL</span><span>${escapeHtml(
        receipt.grandTotal,
      )}</span></div>

      <div class="thank-you">${escapeHtml(receipt.footerText)}</div>
    </main>
  </body>
</html>`;
}
