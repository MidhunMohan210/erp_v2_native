import {
  createFixedWidthLine,
  createSeparator,
  ESC_POS_COMMANDS,
  lineFeed,
  wrapText,
} from "@/features/bluetoothPrinter/escposCommands";
import type { SaleThermalReceiptData } from "@/features/salePrint/utils/buildSaleThermalReceiptData";

export type BuildSaleEscPosReceiptOptions = {
  receiptWidth?: number;
};

const DEFAULT_RECEIPT_WIDTH = 42;
const INFO_LEFT_WIDTH = 21;
const INFO_RIGHT_WIDTH = 21;

function addCenteredLine(parts: string[], width: number, value?: string | null) {
  if (!value) return;
  wrapText(value, width).forEach((line) => parts.push(line, lineFeed()));
}

function addSeparator(parts: string[], width: number) {
  parts.push(createSeparator(width), lineFeed());
}

function addAmountRow(parts: string[], label: string, value: string) {
  parts.push(
    createFixedWidthLine([
      { text: label, width: 24 },
      { text: value, width: 18, align: "right" },
    ]),
    lineFeed(),
  );
}

function addSaleAndCustomerSection(
  parts: string[],
  receipt: SaleThermalReceiptData,
) {
  const leftLines = [
    "BILL TO",
    ...wrapText(receipt.customer.name || "", INFO_LEFT_WIDTH),
    ...wrapText(receipt.customer.billingAddress, INFO_LEFT_WIDTH),
  ];
  const rightLines = [
    ...wrapText(`No: ${receipt.orderNumber}`, INFO_RIGHT_WIDTH),
    ...wrapText(`Date: ${receipt.date}`, INFO_RIGHT_WIDTH),
  ];
  const lineCount = Math.max(leftLines.length, rightLines.length);

  for (let index = 0; index < lineCount; index += 1) {
    parts.push(
      createFixedWidthLine([
        { text: leftLines[index] ?? "", width: INFO_LEFT_WIDTH },
        { text: rightLines[index] ?? "", width: INFO_RIGHT_WIDTH, align: "right" },
      ]),
      lineFeed(),
    );
  }
}

export function buildSaleEscPosReceipt(
  receipt: SaleThermalReceiptData,
  options: BuildSaleEscPosReceiptOptions = {},
): string {
  const width = options.receiptWidth ?? DEFAULT_RECEIPT_WIDTH;
  const parts: string[] = [
    ESC_POS_COMMANDS.initialize,
    ESC_POS_COMMANDS.fontA,
    ESC_POS_COMMANDS.normalSize,
    lineFeed(),
    ESC_POS_COMMANDS.alignCenter,
    ESC_POS_COMMANDS.boldOn,
    ESC_POS_COMMANDS.doubleSize,
    receipt.company.name,
    lineFeed(),
    ESC_POS_COMMANDS.normalSize,
    ESC_POS_COMMANDS.boldOff,
  ];

  receipt.company.detailLines.forEach((line) => addCenteredLine(parts, width, line));
  addCenteredLine(parts, width, receipt.title);
  addSeparator(parts, width);
  addSaleAndCustomerSection(parts, receipt);
  addSeparator(parts, width);

  parts.push(
    createFixedWidthLine([
      { text: "SL", width: 3 },
      { text: "TAX%", width: 5, align: "right" },
      { text: "MRP", width: 7, align: "right" },
      { text: "RATE", width: 7, align: "right" },
      { text: "QTY", width: 5, align: "right" },
      { text: "TOTAL", width: 15, align: "right" },
    ]),
    lineFeed(),
  );

  receipt.productRows.forEach((row) => {
    wrapText(`${row.number}. ${row.name}`, width).forEach((line) => {
      parts.push(line, lineFeed());
    });
    if (row.batchLabel) {
      wrapText(row.batchLabel, width).forEach((line) => parts.push(line, lineFeed()));
    }
    parts.push(
      createFixedWidthLine([
        { text: row.number, width: 3 },
        { text: row.taxRate, width: 5, align: "right" },
        { text: row.mrp, width: 7, align: "right" },
        { text: row.rate, width: 7, align: "right" },
        { text: row.quantity, width: 5, align: "right" },
        { text: row.total, width: 15, align: "right" },
      ]),
      lineFeed(),
    );
  });

  addSeparator(parts, width);
  if (receipt.additionalChargeRows.length > 0) {
    addCenteredLine(parts, width, "ADDITIONAL CHARGES");
    receipt.additionalChargeRows.forEach((charge) => {
      addAmountRow(
        parts,
        `${charge.actionSymbol} ${charge.option}`,
        charge.finalValue,
      );
    });
    addSeparator(parts, width);
  }
  addAmountRow(parts, "Total Quantity", receipt.totalQuantity);
  addAmountRow(parts, "Sub Total", receipt.subTotal);
  if (receipt.additionalChargeRows.length > 0) {
    addAmountRow(parts, "Total Additional", receipt.additionalChargeTotal);
  }
  addAmountRow(parts, "MRP Total", receipt.mrpTotal);
  addAmountRow(parts, "Round Off", receipt.roundOff);
  addSeparator(parts, width);
  // The Bluetooth transport uses ASCII, so use Rs. instead of the rupee symbol.
  addAmountRow(parts, "GRAND TOTAL", `Rs. ${receipt.grandTotal}`);
  addSeparator(parts, width);
  addCenteredLine(parts, width, receipt.footerText);
  addCenteredLine(parts, width, "Visit Us Again");
  parts.push(lineFeed(2));

  return parts.join("");
}
