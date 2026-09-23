import type { Company } from "@/types/company";
import type { VoucherPrintConfig } from "@/types/printConfiguration";
import type { PrintableSaleDocument } from "@/types/saleOrder";
import { buildSaleThermalReceiptData } from "@/features/salePrint/utils/buildSaleThermalReceiptData";

type CreateThermal80SaleHtmlParams = {
  sale: PrintableSaleDocument;
  company: Company;
  configuration: VoucherPrintConfig;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createThermal80SaleHtml({
  sale,
  company,
  configuration,
}: CreateThermal80SaleHtmlParams): string {
  const receipt = buildSaleThermalReceiptData({ sale, company, configuration });
  const productRows = receipt.productRows
    .map(
      (row) => `
        <tbody class="product-row-group">
          <tr class="product-name-row">
            <td colspan="6">${escapeHtml(row.number)}. ${escapeHtml(row.name)}${row.batchLabel ? `<div class="batch-label">${escapeHtml(row.batchLabel)}</div>` : ""}</td>
          </tr>
          <tr class="product-values-row">
            <td>${escapeHtml(row.number)}</td>
            <td>${escapeHtml(row.taxRate)}</td>
            <td>${escapeHtml(row.mrp)}</td>
            <td>${escapeHtml(row.rate)}</td>
            <td>${escapeHtml(row.quantity)}</td>
            <td>${escapeHtml(row.total)}</td>
          </tr>
        </tbody>`,
    )
    .join("");
  const additionalChargeRows = receipt.additionalChargeRows
    .map(
      (row) => `
        <div class="summary-row">
          <span>${escapeHtml(`${row.actionSymbol} ${row.option}`)}</span>
          <span>${escapeHtml(row.finalValue)}</span>
        </div>`,
    )
    .join("");
  const additionalChargesSection = receipt.additionalChargeRows.length
    ? `
      <section class="additional-charges">
        <div class="section-title">ADDITIONAL CHARGES</div>
        ${additionalChargeRows}
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { size: 80mm 210mm; margin: 4mm 0 0; }
      @page:first { margin: 0; }
      * { box-sizing: border-box; }
      html, body { width: 80mm; margin: 0; background: #fff; color: #000; font-family: "Courier New", Courier, monospace; font-size: 8px; line-height: 1.3; }
      .thermal-page { width: 80mm; padding: 3mm; }
      .header, .thank-you { text-align: center; }
      .company-name { font-size: 12px; font-weight: 700; overflow-wrap: anywhere; }
      .company-detail { font-size: 8px; overflow-wrap: anywhere; }
      .document-title { margin-top: 2.5mm; font-size: 11px; font-weight: 700; }
      .separator { margin: 1.5mm 0; border-top: 1px dashed #000; }
      .customer-row { display: flex; justify-content: space-between; gap: 2mm; font-size: 8px; }
      .customer { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .sale-meta { flex: 0 0 40%; text-align: right; overflow-wrap: anywhere; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { padding: 0.7mm 0.25mm; overflow-wrap: anywhere; }
      .items-table { border-bottom: 1px dashed #000; }
      .items-table th { border-bottom: 1px dashed #000; text-align: right; font-size: 7px; }
      .items-table th:first-child { text-align: left; }
      .sl { width: 7%; } .tax { width: 11%; } .mrp { width: 16%; } .rate { width: 16%; } .qty { width: 12%; } .total { width: 38%; }
      .product-name-row td { padding-top: 1.2mm; padding-bottom: 0.2mm; font-size: 8.5px; font-weight: 700; text-align: left; }
      .product-values-row td { padding-top: 0.2mm; padding-bottom: 1.2mm; text-align: right; white-space: nowrap; }
      .product-values-row td:first-child { text-align: left; }
      .product-row-group { break-inside: avoid; page-break-inside: avoid; }
      .batch-label { margin-top: 0.5mm; font-size: 7.5px; font-weight: 400; }
      .additional-charges { margin-top: 0.5mm; border-bottom: 1px dashed #000; padding: 1mm 0; }
      .section-title { margin-bottom: 0.75mm; font-weight: 700; text-align: left; }
      .summary { margin-top: 0.5mm; border-bottom: 1px dashed #000; padding: 1mm 0; }
      .summary-row, .summary-pair, .grand-total { display: flex; justify-content: space-between; gap: 4mm; padding: 0.35mm 0; }
      .summary-row span:last-child, .grand-total span:last-child { text-align: right; white-space: nowrap; }
      .summary-cell { display: flex; flex: 1; justify-content: space-between; gap: 1mm; min-width: 0; }
      .summary-cell span:last-child { text-align: right; white-space: nowrap; }
      .grand-total { margin-top: 0.5mm; padding: 1.5mm 0; border-bottom: 2px double #000; font-size: 10px; font-weight: 700; }
      .thank-you { margin-top: 2mm; font-weight: 700; }
    </style>
  </head>
  <body>
    <main class="thermal-page">
      <header class="header">
        <div class="company-name">${escapeHtml(receipt.company.name)}</div>
        <div class="company-detail">${receipt.company.detailLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>
        <div class="document-title">${escapeHtml(receipt.title)}</div>
      </header>
      <div class="separator"></div>
      <section class="customer-row">
        <div class="customer"><strong>BILL TO</strong><div>${escapeHtml(receipt.customer.name)}</div><div>${escapeHtml(receipt.customer.billingAddress)}</div></div>
        <div class="sale-meta"><div>No: ${escapeHtml(receipt.orderNumber)}</div><div>Date: ${escapeHtml(receipt.date)}</div></div>
      </section>
      <div class="separator"></div>
      <table class="items-table">
        <colgroup><col class="sl" /><col class="tax" /><col class="mrp" /><col class="rate" /><col class="qty" /><col class="total" /></colgroup>
        <thead><tr><th>SL</th><th>TAX%</th><th>MRP</th><th>RATE</th><th>QTY</th><th>TOTAL</th></tr></thead>
        ${productRows}
      </table>
      ${additionalChargesSection}
      <section class="summary">
        <div class="summary-pair">
          <div class="summary-cell"><span>Total Quantity</span><span>${escapeHtml(receipt.totalQuantity)}</span></div>
          <div class="summary-cell"><span>Sub Total</span><span>${escapeHtml(receipt.subTotal)}</span></div>
        </div>
        ${receipt.additionalChargeRows.length ? `<div class="summary-row"><span>Total Additional Charges</span><span>${escapeHtml(receipt.additionalChargeTotal)}</span></div>` : ""}
        <div class="summary-pair">
          <div class="summary-cell"><span>MRP Total</span><span>${escapeHtml(receipt.mrpTotal)}</span></div>
          <div class="summary-cell"><span>Round Off</span><span>${escapeHtml(receipt.roundOff)}</span></div>
        </div>
      </section>
      <div class="grand-total"><span>GRAND TOTAL</span><span>₹ ${escapeHtml(receipt.grandTotal)}</span></div>
      <div class="thank-you">
        <div>${escapeHtml(receipt.footerText)}</div>
        <div>Visit Us Again</div>
      </div>
    </main>
  </body>
</html>`;
}
