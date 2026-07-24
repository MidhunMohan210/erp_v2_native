import type {
  AdditionalChargeMaster,
  SaleOrderAdditionalCharge,
  SaleOrderAdditionalChargeTotals,
} from "@/types/saleOrder";
import type { SaleTaxType } from "@/types/voucher";

function toNumber(value: number | string | undefined): number {
  return Number(value) || 0;
}

export function calculateAdditionalCharge(
  charge: SaleOrderAdditionalCharge,
  taxType: SaleTaxType,
): SaleOrderAdditionalCharge {
  const value = toNumber(charge.value);
  const sign = charge.action === "subtract" ? -1 : 1;
  const igstAmount =
    taxType === "igst" ? value * (toNumber(charge.igst) / 100) : 0;
  const cgstAmount =
    taxType === "cgst_sgst" ? value * (toNumber(charge.cgst) / 100) : 0;
  const sgstAmount =
    taxType === "cgst_sgst" ? value * (toNumber(charge.sgst) / 100) : 0;
  const taxAmount = igstAmount + cgstAmount + sgstAmount;

  // The current web business rule records these rates but does not apply their
  // amounts to an additional-charge row.
  const cessAmount = 0;
  const addlCessAmount = 0;
  const stateCessAmount = 0;

  return {
    ...charge,
    igstAmount,
    cgstAmount,
    sgstAmount,
    taxAmount,
    cessAmount,
    addlCessAmount,
    stateCessAmount,
    // Keep full calculation precision; only UI previews format to two decimals.
    finalValue: (value + taxAmount) * sign,
  };
}

export function createAdditionalCharge(
  master: AdditionalChargeMaster,
  taxType: SaleTaxType,
): SaleOrderAdditionalCharge {
  return calculateAdditionalCharge(
    {
      _id: master._id,
      option: master.name || "Additional Charge",
      value: "",
      action: "add",
      hsn: master.hsn ?? "",
      igst: toNumber(master.igst),
      cgst: toNumber(master.cgst),
      sgst: toNumber(master.sgst),
      cess: toNumber(master.cess),
      addlCess: toNumber(master.addl_cess),
      stateCess: toNumber(master.state_cess),
      igstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      taxAmount: 0,
      cessAmount: 0,
      addlCessAmount: 0,
      stateCessAmount: 0,
      finalValue: 0,
    },
    taxType,
  );
}

export function calculateAdditionalChargeTotals(
  charges: SaleOrderAdditionalCharge[],
  taxType: SaleTaxType,
  itemTotal: number,
): {
  charges: SaleOrderAdditionalCharge[];
  totals: SaleOrderAdditionalChargeTotals;
} {
  const calculatedCharges = charges.map((charge) =>
    calculateAdditionalCharge(charge, taxType),
  );

  const totals = calculatedCharges.reduce(
    (current, charge) => {
      const sign = charge.action === "subtract" ? -1 : 1;
      return {
        totalAdditionalCharge:
          current.totalAdditionalCharge + charge.finalValue,
        totalAdditionalChargeTaxAmount:
          current.totalAdditionalChargeTaxAmount + charge.taxAmount * sign,
        totalAdditionalChargeIgstAmount:
          current.totalAdditionalChargeIgstAmount + charge.igstAmount * sign,
        totalAdditionalChargeCgstAmount:
          current.totalAdditionalChargeCgstAmount + charge.cgstAmount * sign,
        totalAdditionalChargeSgstAmount:
          current.totalAdditionalChargeSgstAmount + charge.sgstAmount * sign,
        totalAdditionalChargeCessAmount:
          current.totalAdditionalChargeCessAmount + charge.cessAmount * sign,
        totalAdditionalChargeAddlCessAmount:
          current.totalAdditionalChargeAddlCessAmount +
          charge.addlCessAmount * sign,
        totalAdditionalChargeStateCessAmount:
          current.totalAdditionalChargeStateCessAmount +
          charge.stateCessAmount * sign,
      };
    },
    {
      totalAdditionalCharge: 0,
      totalAdditionalChargeTaxAmount: 0,
      totalAdditionalChargeIgstAmount: 0,
      totalAdditionalChargeCgstAmount: 0,
      totalAdditionalChargeSgstAmount: 0,
      totalAdditionalChargeCessAmount: 0,
      totalAdditionalChargeAddlCessAmount: 0,
      totalAdditionalChargeStateCessAmount: 0,
    },
  );

  const amountWithAdditionalCharge =
    itemTotal + totals.totalAdditionalCharge;

  return {
    charges: calculatedCharges,
    totals: {
      ...totals,
      amountWithAdditionalCharge,
      finalAmount: amountWithAdditionalCharge,
    },
  };
}
