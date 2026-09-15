function sanitizeFileNamePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createSaleOrderPdfFileName(
  voucherNumber?: string,
  saleOrderId?: string,
  filePrefix = "Sale-Order",
): string {
  const identifier = sanitizeFileNamePart(
    voucherNumber || saleOrderId || "document",
  );

  return `${filePrefix}-${identifier || "document"}.pdf`;
}
