import type { SaleTaxType, VoucherType } from "@/types/voucher";

export function formatVoucherDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return formatVoucherDate(new Date());
}

export function parseVoucherDate(value: string): Date {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsedDate = new Date(year, month - 1, day);

  // Date automatically rolls invalid values forward, so compare every part.
  const isValidDate =
    yearText?.length === 4 &&
    monthText?.length === 2 &&
    dayText?.length === 2 &&
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day;

  return isValidDate ? parsedDate : new Date();
}

export function resolveSaleTaxType(
  companyState?: string,
  partyState?: string,
): SaleTaxType {
  // A missing state cannot safely be treated as an intra-state transaction.
  if (!companyState || !partyState) return "igst";
  return companyState === partyState ? "cgst_sgst" : "igst";
}

export function getVoucherTypeLabel(voucherType: VoucherType): string {
  if (voucherType === "saleOrder") {
    return "Sale Order";
  }

  return "Receipt";
}
