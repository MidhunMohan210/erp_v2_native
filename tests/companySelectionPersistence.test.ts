import assert from "node:assert/strict";
import test from "node:test";

import {
  getAuthorizedSavedCompany,
  getSelectedCompanyStorageKey,
  isCurrentCompanyRestoreContext,
} from "../src/services/companySelectionPersistence";
import {
  endAuthSession,
  getCurrentAuthGeneration,
  startAuthSession,
} from "../src/services/authSessionGeneration";
import type { Company } from "../src/types/company";

const companyA: Company = { _id: "company-a", name: "Company A" };
const companyB: Company = { _id: "company-b", name: "Company B" };

test("each user has a separate selected-company storage key", () => {
  assert.notEqual(
    getSelectedCompanyStorageKey("user-a"),
    getSelectedCompanyStorageKey("user-b"),
  );
  assert.equal(
    getSelectedCompanyStorageKey("user-a"),
    getSelectedCompanyStorageKey("user-a"),
  );
});

test("selected-company storage keys use only SecureStore-supported characters", () => {
  const key = getSelectedCompanyStorageKey("user:one/email@example.com");

  assert.match(key, /^[a-zA-Z0-9._-]+$/);
  assert.notEqual(
    getSelectedCompanyStorageKey(".2f"),
    getSelectedCompanyStorageKey("/"),
  );
});

test("a saved company restores only when it remains in the accessible company list", () => {
  const savedCompany = JSON.stringify(companyA);

  assert.deepEqual(getAuthorizedSavedCompany(savedCompany, [companyA]), companyA);
  assert.equal(getAuthorizedSavedCompany(savedCompany, [companyB]), null);
});

test("a malformed saved company requires manual selection", () => {
  assert.equal(getAuthorizedSavedCompany("not-json", [companyA]), null);
  assert.equal(getAuthorizedSavedCompany(JSON.stringify({}), [companyA]), null);
});

test("a delayed restore from User A is ignored after User B starts a session", () => {
  startAuthSession();
  const userAContext = {
    userId: "user-a",
    authGeneration: getCurrentAuthGeneration(),
  };

  endAuthSession();
  startAuthSession();

  assert.equal(isCurrentCompanyRestoreContext(userAContext, "user-b"), false);
});

test("a delayed restore is ignored after logout", () => {
  startAuthSession();
  const context = {
    userId: "user-a",
    authGeneration: getCurrentAuthGeneration(),
  };

  endAuthSession();

  assert.equal(isCurrentCompanyRestoreContext(context, undefined), false);
});
