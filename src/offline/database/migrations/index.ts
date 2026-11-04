// Lists the migration instructions available in this app version.
// This file contains TypeScript objects only. It does not create a SQLite table
// or store migration history on the phone. The _offline_migrations SQLite table
// stores the history after a migration has successfully run.
import type { SQLiteDatabase } from "expo-sqlite";

import { createMigrationLedger } from "./001_create_migration_ledger";
import { createOfflineParty } from "./002_create_offline_party";
import { createOfflineProduct } from "./003_create_offline_product";
import { createOfflinePriceLevel } from "./004_create_offline_price_level";
import { createOfflineVoucherSeries } from "./005_create_offline_voucher_series";
import { createOfflineAdditionalCharge } from "./006_create_offline_additional_charge";
import { createOfflineProductFilter } from "./007_create_offline_product_filter";

// This TypeScript type is a rule for migration objects in our source code.
// Every migration needs a version, a readable name, and an up function.
export type Migration = {
  // A unique number that tells the app which database change this is.
  version: number;
  // A readable label saved in the migration-history table after this runs.
  name: string;
  // The function that performs the database change, such as CREATE TABLE
  // or ALTER TABLE. It receives the already-open SQLite connection.
  up: (database: SQLiteDatabase) => Promise<void>;
};

// Keep this list in version order. applyMigrations reads this list to decide
// which changes the local SQLite database still needs.
export const migrations: Migration[] = [
  createMigrationLedger,
  createOfflineParty,
  createOfflineProduct,
  createOfflinePriceLevel,
  createOfflineVoucherSeries,
  createOfflineAdditionalCharge,
  createOfflineProductFilter,
];
//createMigrationLedger is the first migration: version 1.It is added to the migrations array:
