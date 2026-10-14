import assert from "node:assert/strict";
import test from "node:test";

import {
  TALLY_ACCEPTED_MESSAGE,
  getTallyModificationMessage,
  getTallyModificationState,
  isTallyAcceptedConflict,
} from "../src/utils/tallyProtection";
import type { TallyRef } from "../src/types/voucher";

const pending: TallyRef = {
  tally_status: "pending",
  tally_voucher_id: null,
  tally_accepted_at: null,
};

const accepted: TallyRef = {
  tally_status: "accepted",
  tally_voucher_id: "tally-1",
  tally_accepted_at: "2026-10-14T10:00:00.000Z",
};

test("only a verified pending voucher with an editable business status can be modified", () => {
  assert.equal(getTallyModificationState(pending, true), "allowed");
  assert.equal(getTallyModificationState(pending, false), "unverified");
});

test("accepted and missing acknowledgement states fail closed", () => {
  assert.equal(getTallyModificationState(accepted, true), "accepted");
  assert.equal(getTallyModificationState(undefined, true), "unverified");
  assert.equal(getTallyModificationMessage("accepted"), TALLY_ACCEPTED_MESSAGE);
});

test("only explicit Tally acceptance conflicts use the acceptance recovery path", () => {
  const tallyConflict = {
    isAxiosError: true,
    response: { status: 409, data: { message: TALLY_ACCEPTED_MESSAGE } },
  };
  const allocationConflict = {
    isAxiosError: true,
    response: { status: 409, data: { message: "Receipt allocation changed" } },
  };

  assert.equal(isTallyAcceptedConflict(tallyConflict), true);
  assert.equal(isTallyAcceptedConflict(allocationConflict), false);
});
