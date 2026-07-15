import type { VoucherType } from "@/types/voucher";

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getVoucherTypeLabel(voucherType: VoucherType): string {
  if (voucherType === "saleOrder") {
    return "Sale Order";
  }

  return "Receipt";
}
