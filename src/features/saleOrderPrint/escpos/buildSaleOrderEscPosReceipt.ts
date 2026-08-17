import {
  createFixedWidthLine,
  createSeparator,
  ESC_POS_COMMANDS,
  lineFeed,
  wrapText,
} from "@/features/bluetoothPrinter/escposCommands";
import type {
  SaleOrderThermalReceiptData,
  ThermalReceiptAdditionalChargeRow,
  ThermalReceiptProductRow,
  ThermalReceiptSummaryRow,
} from "@/features/saleOrderPrint/utils/buildSaleOrderThermalReceiptData";

export type BuildSaleOrderEscPosReceiptOptions = {
  receiptWidth?: number;
};

const DEFAULT_RECEIPT_WIDTH = 42;
const PRODUCT_QTY_WIDTH = 14;
const PRODUCT_RATE_WIDTH = 14;
const PRODUCT_AMOUNT_WIDTH = 14;
const LABEL_WIDTH = 24;
const VALUE_WIDTH = 18;
const INFO_LEFT_WIDTH = 21;
const INFO_RIGHT_WIDTH = 21;

function addCenteredLine(
  parts: string[],
  width: number,
  value?: string | null,
) {
  if (!value) return;
  wrapText(value, width).forEach((line) => {
    parts.push(line, lineFeed());
  });
}

function addSeparator(parts: string[], width: number) {
  parts.push(createSeparator(width), lineFeed());
}

function wrapOptionalText(value: string | null | undefined, width: number) {
  return value ? wrapText(value, width) : [];
}

function createCompactOrderNumber(value: string) {
  return value.replace(/\s*\/\s*/g, "/").trim();
}

function addOrderAndCustomerSection(
  parts: string[],
  receipt: SaleOrderThermalReceiptData,
) {
  const orderNumber = createCompactOrderNumber(receipt.orderNumber);
  const leftLines = [
    "BILL TO",
    ...wrapOptionalText(receipt.customer.name, INFO_LEFT_WIDTH),
    ...wrapOptionalText(receipt.customer.billingAddress, INFO_LEFT_WIDTH),
    ...wrapOptionalText(receipt.customer.gstLine, INFO_LEFT_WIDTH),
    ...wrapOptionalText(receipt.customer.mobileLine, INFO_LEFT_WIDTH),
  ];
  const rightLines = [
    ...wrapText(`No: ${orderNumber}`, INFO_RIGHT_WIDTH),
    ...wrapText(`Date: ${receipt.date}`, INFO_RIGHT_WIDTH),
  ];
  const lineCount = Math.max(leftLines.length, rightLines.length);

  for (let index = 0; index < lineCount; index += 1) {
    parts.push(
      createFixedWidthLine([
        { text: leftLines[index] ?? "", width: INFO_LEFT_WIDTH },
        {
          text: rightLines[index] ?? "",
          width: INFO_RIGHT_WIDTH,
          align: "right",
        },
      ]),
      lineFeed(),
    );
  }
}

function addProductRow(
  parts: string[],
  row: ThermalReceiptProductRow,
  width: number,
) {
  wrapText(row.name, width).forEach((nameLine) => {
    parts.push(
      createFixedWidthLine([{ text: nameLine, width }]),
      lineFeed(),
    );
  });

  parts.push(
    createFixedWidthLine([
      {
        text: row.quantity,
        width: PRODUCT_QTY_WIDTH,
        align: "right",
      },
      {
        text: row.rate,
        width: PRODUCT_RATE_WIDTH,
        align: "right",
      },
      {
        text: row.taxableAmount,
        width: PRODUCT_AMOUNT_WIDTH,
        align: "right",
      },
    ]),
    lineFeed(),
  );
}

function addAmountRow(
  parts: string[],
  label: string,
  value: string,
  labelWidth = LABEL_WIDTH,
  valueWidth = VALUE_WIDTH,
) {
  parts.push(
    createFixedWidthLine([
      { text: label, width: labelWidth },
      { text: value, width: valueWidth, align: "right" },
    ]),
    lineFeed(),
  );
}

function addAdditionalChargeRow(
  parts: string[],
  row: ThermalReceiptAdditionalChargeRow,
) {
  const label = `${row.actionSymbol} ${row.option}`;
  addAmountRow(parts, label, row.finalValue);
}

function addSummaryRow(parts: string[], row: ThermalReceiptSummaryRow) {
  addAmountRow(parts, row.label, row.value);
}

export function buildSaleOrderEscPosReceipt(
  receipt: SaleOrderThermalReceiptData,
  options: BuildSaleOrderEscPosReceiptOptions = {},
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

  receipt.company.detailLines.forEach((line) => {
    addCenteredLine(parts, width, line);
  });

  addCenteredLine(parts, width, receipt.title);
  addSeparator(parts, width);
  addOrderAndCustomerSection(parts, receipt);
  addSeparator(parts, width);

  parts.push(
    createFixedWidthLine([{ text: "Product", width }]),
    lineFeed(),
    createFixedWidthLine([
      { text: "Qty", width: PRODUCT_QTY_WIDTH, align: "right" },
      { text: "Rate", width: PRODUCT_RATE_WIDTH, align: "right" },
      { text: "Amount", width: PRODUCT_AMOUNT_WIDTH, align: "right" },
    ]),
    lineFeed(),
  );

  receipt.productRows.forEach((row) => {
    addProductRow(parts, row, width);
  });

  addSeparator(parts, width);
  addAmountRow(parts, "Total", receipt.subtotal);

  if (receipt.additionalChargeRows.length > 0) {
    addSeparator(parts, width);
    addCenteredLine(parts, width, "ADDITIONAL CHARGES");
    receipt.additionalChargeRows.forEach((row) => {
      addAdditionalChargeRow(parts, row);
    });
    addAmountRow(parts, "Total Additional", receipt.additionalChargeTotal);
  }

  if (receipt.summaryRows.length > 0) {
    addSeparator(parts, width);
    receipt.summaryRows.forEach((row) => {
      addSummaryRow(parts, row);
    });
  }

  addSeparator(parts, width);
  addAmountRow(parts, "GRAND TOTAL", receipt.grandTotal);
  addSeparator(parts, width);
  addCenteredLine(parts, width, receipt.footerText);
  parts.push(lineFeed(2));

  return parts.join("");
}
