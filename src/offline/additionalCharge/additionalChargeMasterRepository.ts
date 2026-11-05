import type { SQLiteDatabase } from "expo-sqlite";

export type OfflineAdditionalCharge = {
  _id: string;
  name: string;
  hsn?: string | null;
  igst?: number;
  cgst?: number;
  sgst?: number;
  cess?: number;
  addl_cess?: number;
  state_cess?: number;
};

type Row = {
  company_id: string; charge_id: string; name: string; hsn: string | null;
  igst: number; cgst: number; sgst: number; cess: number; addl_cess: number; state_cess: number;
};

function text(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function rate(value: unknown): number {
  if (value == null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Offline Additional Charge tax rates must be finite non-negative numbers.");
  }
  return value;
}

function toRow(companyId: string, charge: OfflineAdditionalCharge): Row {
  if (!text(companyId) || !charge || typeof charge !== "object" || !text(charge._id) || !text(charge.name)) {
    throw new Error("Each offline Additional Charge needs an ID and name.");
  }
  if (charge.hsn != null && typeof charge.hsn !== "string") {
    throw new Error("Offline Additional Charge HSN must be text.");
  }
  return {
    company_id: companyId, charge_id: charge._id, name: charge.name.trim(), hsn: charge.hsn ?? null,
    igst: rate(charge.igst), cgst: rate(charge.cgst), sgst: rate(charge.sgst),
    cess: rate(charge.cess), addl_cess: rate(charge.addl_cess), state_cess: rate(charge.state_cess),
  };
}

function prepare(companyId: string, charges: OfflineAdditionalCharge[]): Row[] {
  const ids = new Set<string>();
  return charges.map((charge) => {
    const row = toRow(companyId, charge);
    if (ids.has(row.charge_id)) throw new Error("The offline Additional Charge list contains duplicate IDs.");
    ids.add(row.charge_id);
    return row;
  });
}

export function validateOfflineAdditionalCharges(companyId: string, charges: OfflineAdditionalCharge[]): void {
  prepare(companyId, charges);
}

/** Prepares all rows first so invalid data cannot remove the prior company snapshot. */
export async function replaceOfflineAdditionalCharges(database: SQLiteDatabase, companyId: string, charges: OfflineAdditionalCharge[],
  saveCompletion?: (database: SQLiteDatabase) => Promise<void>): Promise<void> {
  const rows = prepare(companyId, charges);
  await database.withTransactionAsync(async () => {
    await database.runAsync("DELETE FROM offline_additional_charge WHERE company_id = ?", companyId);
    for (const row of rows) {
      await database.runAsync(
        `INSERT INTO offline_additional_charge (company_id, charge_id, name, hsn, igst, cgst, sgst, cess, addl_cess, state_cess)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row.company_id, row.charge_id, row.name, row.hsn, row.igst, row.cgst, row.sgst, row.cess, row.addl_cess, row.state_cess,
      );
    }
    if (saveCompletion) await saveCompletion(database);
  });
}

export async function listOfflineAdditionalCharges(database: SQLiteDatabase, companyId: string): Promise<OfflineAdditionalCharge[]> {
  const rows = await database.getAllAsync<Row>(
    "SELECT * FROM offline_additional_charge WHERE company_id = ? ORDER BY name COLLATE NOCASE, charge_id", companyId,
  );
  return rows.map((row) => ({ _id: row.charge_id, name: row.name, hsn: row.hsn, igst: row.igst, cgst: row.cgst, sgst: row.sgst, cess: row.cess, addl_cess: row.addl_cess, state_cess: row.state_cess }));
}

export async function countOfflineAdditionalCharges(database: SQLiteDatabase, companyId: string): Promise<number> {
  const row = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM offline_additional_charge WHERE company_id = ?", companyId);
  return Number(row?.count ?? 0);
}
