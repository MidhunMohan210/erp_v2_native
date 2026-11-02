import type { SQLiteDatabase } from "expo-sqlite";

// Stores a company-scoped copy of Party master fields. sync_status is local
// metadata: pending rows were created on the device and must survive imports.
//up means “apply this database migration.”A migration is a one-time database upgrade
// Old app database:
//   _offline_migrations table only

// New app database:
//   _offline_migrations table
//   offline_party table  ← added by migration 002


//Use	Best for
// runAsync	One SQL action with values, such as INSERT or DELETE
// execAsync	Schema/setup SQL such as CREATE TABLE, CREATE INDEX, or several SQL statements

export const createOfflineParty = {
  version: 2,
  name: "create_offline_party",
  async up(database: SQLiteDatabase): Promise<void> {
    await database.execAsync(`
      CREATE TABLE offline_party (
        cmp_id TEXT NOT NULL,
        _id TEXT NOT NULL,
        Primary_user_id TEXT,
        Secondary_user_id TEXT,
        partyType TEXT,
        accountGroup TEXT,
        subGroup TEXT,
        priceLevel TEXT,
        groupName TEXT,
        childGroupName TEXT,
        openingBalanceAmount REAL,
        openingBalanceType TEXT,
        partyName TEXT NOT NULL,
        mobileNumber TEXT,
        country TEXT,
        state TEXT,
        pin TEXT,
        emailID TEXT,
        gstNo TEXT,
        panNo TEXT,
        billingAddress TEXT,
        shippingAddress TEXT,
        creditPeriod TEXT,
        creditLimit TEXT,
        state_reference TEXT,
        pincode TEXT,
        party_master_id TEXT,
        acholder_name TEXT,
        ac_no TEXT,
        ifsc TEXT,
        swift_code TEXT,
        bank_name TEXT,
        branch TEXT,
        upi_id TEXT,
        bsr_code TEXT,
        client_code TEXT,
        source TEXT,
        lastUpdatedBySource TEXT,
        tallyUserName TEXT,
        created_by TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        sync_status TEXT NOT NULL DEFAULT 'synced'
          CHECK (sync_status IN ('synced', 'pending')),
        PRIMARY KEY (cmp_id, _id)
      )
    `);
    await database.execAsync(
      "CREATE INDEX offline_party_company_name_idx ON offline_party (cmp_id, partyName)",
    );
  },
};
