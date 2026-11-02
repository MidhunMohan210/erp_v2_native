import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("../src/offline/party/partyMasterRepository.ts", import.meta.url),
  "utf8",
);

const columns = [
  "cmp_id", "_id", "Primary_user_id", "Secondary_user_id", "partyType", "accountGroup", "subGroup", "priceLevel", "groupName", "childGroupName", "openingBalanceAmount", "openingBalanceType", "partyName", "mobileNumber", "country", "state", "pin", "emailID", "gstNo", "panNo", "billingAddress", "shippingAddress", "creditPeriod", "creditLimit", "state_reference", "pincode", "party_master_id", "acholder_name", "ac_no", "ifsc", "swift_code", "bank_name", "branch", "upi_id", "bsr_code", "client_code", "source", "lastUpdatedBySource", "tallyUserName", "created_by", "createdAt", "updatedAt", "sync_status",
];

function loadRepository() {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) {${compiled}})`, {})
    (() => { throw new Error("The repository has no runtime imports."); }, module, module.exports);
  return module.exports;
}

class FakeDatabase {
  constructor(rows = []) {
    this.rows = rows;
    this.failOnPartyId = null;
  }

  async withTransactionAsync(work) {
    const snapshot = this.rows.map((row) => ({ ...row }));
    try {
      await work();
    } catch (error) {
      this.rows = snapshot;
      throw error;
    }
  }

  async runAsync(sql, ...values) {
    if (sql.includes("DELETE FROM offline_party")) {
      const [cmpId] = values;
      this.rows = this.rows.filter(
        (row) => row.cmp_id !== cmpId || row.sync_status !== "synced",
      );
      return;
    }
    if (sql.includes("INSERT INTO offline_party")) {
      const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
      if (row._id === this.failOnPartyId) throw new Error("simulated insert failure");
      const existingIndex = this.rows.findIndex(
        (existing) => existing.cmp_id === row.cmp_id && existing._id === row._id,
      );
      if (existingIndex === -1) {
        this.rows.push(row);
      } else if (this.rows[existingIndex].sync_status === "synced") {
        this.rows[existingIndex] = row;
      }
      return;
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }

  async getAllAsync(_sql, cmpId) {
    return this.rows
      .filter((row) => row.cmp_id === cmpId)
      .sort((left, right) => left.partyName.localeCompare(right.partyName));
  }
}

function party(cmp_id, _id, partyName) {
  return { cmp_id, _id, partyName, partyType: "party", accountGroup: "group-1" };
}

test("imports Party masters and replaces prior downloaded rows", async () => {
  const { replaceDownloadedParties, readSavedParties } = loadRepository();
  const database = new FakeDatabase([
    { ...party("company-a", "old", "Old"), sync_status: "synced" },
  ]);

  await replaceDownloadedParties(database, "company-a", [
    party("company-a", "one", "Alpha"),
    party("company-a", "two", "Beta"),
  ]);

  assert.deepEqual(
    (await readSavedParties(database, "company-a")).map((row) => row._id),
    ["one", "two"],
  );
});

test("failed import rolls back and preserves the prior downloaded rows", async () => {
  const { replaceDownloadedParties, readSavedParties } = loadRepository();
  const database = new FakeDatabase([
    { ...party("company-a", "old", "Old"), sync_status: "synced" },
  ]);
  database.failOnPartyId = "two";

  await assert.rejects(
    replaceDownloadedParties(database, "company-a", [
      party("company-a", "one", "Alpha"),
      party("company-a", "two", "Beta"),
    ]),
    /simulated insert failure/,
  );

  assert.deepEqual(
    (await readSavedParties(database, "company-a")).map((row) => row._id),
    ["old"],
  );
});

test("imports are company-isolated and preserve pending local Parties", async () => {
  const { replaceDownloadedParties, readSavedParties } = loadRepository();
  const database = new FakeDatabase([
    { ...party("company-a", "local", "Local only"), sync_status: "pending" },
    { ...party("company-b", "b-old", "Other company"), sync_status: "synced" },
  ]);

  await replaceDownloadedParties(database, "company-a", [party("company-a", "server", "Server")]);

  assert.deepEqual(
    (await readSavedParties(database, "company-a")).map((row) => row._id),
    ["local", "server"],
  );
  assert.deepEqual(
    (await readSavedParties(database, "company-b")).map((row) => row._id),
    ["b-old"],
  );
});
