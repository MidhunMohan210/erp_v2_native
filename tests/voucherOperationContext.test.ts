import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceContextGeneration,
  endAuthSession,
  startAuthSession,
} from "../src/services/authSessionGeneration";
import {
  createVoucherOperationContext,
  isCurrentVoucherOperationContext,
} from "../src/services/voucherOperationContext";

function isActiveFor(
  userId: string | undefined,
  companyId: string | undefined,
  context = createVoucherOperationContext("user-a", "company-a"),
): boolean {
  return isCurrentVoucherOperationContext(context, userId, companyId);
}

test("a delayed Sale completion is ignored after a company switch", () => {
  startAuthSession();
  const saleContext = createVoucherOperationContext("user-a", "company-a");

  advanceContextGeneration();

  assert.equal(
    isActiveFor("user-a", "company-b", saleContext),
    false,
  );
});

test("a delayed Sale Order completion is ignored after logout and login", () => {
  startAuthSession();
  const saleOrderContext = createVoucherOperationContext("user-a", "company-a");

  endAuthSession();
  startAuthSession();

  assert.equal(
    isActiveFor("user-b", "company-b", saleOrderContext),
    false,
  );
});

test("a delayed Receipt allocation validation cannot use the old company", () => {
  startAuthSession();
  const receiptContext = createVoucherOperationContext("user-a", "company-a");

  advanceContextGeneration();

  assert.equal(
    isActiveFor("user-a", "company-b", receiptContext),
    false,
  );
});

test("a normal voucher completion stays active in the same user and company", () => {
  startAuthSession();
  const context = createVoucherOperationContext("user-a", "company-a");

  assert.equal(isActiveFor("user-a", "company-a", context), true);
});
