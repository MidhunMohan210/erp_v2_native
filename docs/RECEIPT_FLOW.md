# Receipt Flow

This document describes the React Native Receipt Create, Edit, and Cancel
flows.

## Web and backend references

The native implementation was checked against:

- `frontend/src/utils/calculateAutoSettlement.js`
- `frontend/src/pages/cashTransaction/CashTransactionScreen.jsx`
- `frontend/src/pages/cashTransaction/RECEIPT_FRONTEND_FLOW.md`
- `frontend/src/hooks/useCashTransactionDraft.js`
- `backend/controllers/cashTransactionController.js`
- `backend/services/cashTransaction.service.js`
- `backend/services/cashTransactionDocument.service.js`
- `backend/schemas/CashTransactionSchema.js`
- `backend/Model/Receipt.js`
- `backend/tests/cash_transactions/receipt.route.test.js`
- `backend/services/receiptAudit.service.js`

The backend remains the only writer for Outstanding, PartyLedger,
PartyMonthlyBalance, CashBankLedger, advance Outstanding, voucher numbering,
and VoucherTimeline.

## Development-only Receipt audit

In development builds, Settings includes **Receipt Transaction Audit**. It
lists Receipt timeline entries and opens a read-only diagnostic for the selected
Receipt. The diagnostic calls `GET /api/cash-transactions/:receiptId/audit`.
The backend route is registered only when `NODE_ENV === "development"`, and it
uses the same authenticated company scope as the Sale audit.

The audit checks the Receipt identity, PartyLedger credit, CashBankLedger
inflow, PartyMonthlyBalance bucket, settlement snapshots, advance Outstanding
row, and VoucherTimeline. It supports both active and cancelled Receipts by
checking their historical posting status. The audit endpoint has no repair,
retry, create, edit, or cancel action; all of its database access is read-only.
The development screen separately offers a strongly confirmed, company-scoped
**Delete All Transactions** maintenance action. That action is not part of the
audit endpoint.

## Screen flow

```text
Receipt Create
  -> Outstanding Allocation
  -> Confirm Allocation
  -> Create Receipt or Retry Same Receipt
  -> Receipt Detail

Receipt Detail
  -> Edit Receipt (historical snapshot mode)
  -> Review saved Receipt allocations
  -> Confirm allocation reset only when requested
  -> Edit Receipt Allocation (current authoritative availability)
  -> Update Receipt

Receipt Detail (active only)
  -> Cancel Receipt confirmation
  -> PUT cancel request
  -> Refresh accounting-related queries
  -> Remain on Receipt Detail with Cancelled status
```

There are two primary screens: `receipt-create` and `receipt-allocation`.
`receipt-create` owns the date, Receipt series, customer, settlement entry
point, instrument, Cash/Bank account, optional Cheque details, narration, and
the direct Create action. It reuses shared voucher date, series, Party,
loading, error, and empty-state components.

`receipt-allocation` owns the Receipt amount input and shows the customer,
all eligible bills, oldest-first allocation, manual selection, settlement
totals, and confirmed advance. It opens after customer selection even when no
amount has been entered. Changing the Redux amount immediately clears manual
choices and reapplies the existing oldest-first allocator. Confirm returns to
the form.

The mobile client sorts Receipt bills by `bill_date` ascending and then by
Outstanding ID. It applies that same FIFO order to the displayed list and to
automatic or manual-selection redistribution, even if an API response arrives
newest-first. Receipt Edit availability and historical settlement displays use
the same oldest-first rule. Edit does not offer manual priority arrows because
allocation priority must remain FIFO.

The allocation screen has three mobile regions: a fixed customer/progress
header with the amount input immediately below it, one virtualized bill list as
the only scrolling region, and a fixed compact allocation footer with Confirm.
The footer shows allocated and advance values without duplicating the detailed
summary retained on Receipt Create.

Selecting Cheque while creating a Receipt defaults the cheque date to the
device's local current date. The user can still choose a different cheque date
before submitting.

The Create Receipt button submits directly from the form after refreshing and
validating current Outstanding allocations. A frozen submission makes that main
button retry-only; there is no second confirmation screen or confirmation POST.
After a successful save, the app opens the newly created Receipt Detail page,
then invalidates Outstanding and related cached lists so later allocation and
balance views use the updated bill balances.
The redirect marks an explicit successful-navigation bypass before replacing
the Create route, so the Create screen's draft-discard guard cannot intercept
a successful navigation.
An uncertain submission remains retry-only on the current screen because the
original UUID and exact payload are required for idempotent recovery. A backend
409 conflict is different: it confirms that UUID belongs to another Receipt
with a different payload. The user can start a fresh Receipt without deleting
the shared conflict record; it remains available for later Pending UI.

Receipt Detail uses the shared Sale and Sale Order detail hero, metrics, and
card treatment. It shows the backend settlement rows as individual bill cards,
including each bill number, settled amount, and remaining Outstanding amount.
Cheque receipts also show their cheque number and cheque date, while Narration
is always visible with an explicit empty-state message when absent.
It opens active Receipts in the dedicated Edit flow. Active Receipts can also
open the shared destructive cancellation sheet. Cancelled Receipts retain the
backend status badge and make both Edit and Cancel unavailable.

## Receipt Edit state and navigation

`receiptEditSlice.ts` owns the active Edit session independently from
`receiptDraftSlice.ts`. Opening or abandoning Edit therefore cannot replace an
unfinished Create draft, its request ID, or its frozen retry payload. The Edit
state is scoped by company and Receipt ID and is cleared when the Edit route is
removed.

The explicit allocation mode is:

```text
snapshot -> reallocation
```

It never moves back to `snapshot` during one Edit session. A stale-data Reload
is a new session state built from the latest committed Receipt detail.

The state stores the Receipt version, original and current amount, editable
date/payment fields, locked party identity, historical settlement rows,
current allocations, and Edit availability items. It does not use
AsyncStorage and never touches the Create Receipt draft.

## Receipt Edit snapshot mode

Edit opens from Receipt Detail and initially calls only the normal Receipt
detail endpoint. The main Edit form shows a compact Receipt Create-style
settlement summary: Receipt amount, Allocated amount, and Advance. It does not
render individual bill cards. Opening that summary navigates to the allocation
review screen, which renders `receipt.settlement_details` directly as
**Allocated Bills** using:

```text
previous_outstanding_amount
settled_amount
remaining_outstanding_amount
```

These labels are Original Amount, Settled by this Receipt, and Balance After
Receipt. The screen does not call the normal Outstanding endpoint or Edit
availability during initial loading. Party is shown as a locked, read-only
field.

The Edit form reuses `VoucherCreateHeader` and `VoucherSeriesSelector`, the
same component tree used by Receipt Create. Date stays editable. The stored
series name and final voucher number are displayed through the disabled series
selector, so Edit never previews, regenerates, or changes the voucher number.

Date, Cash/Bank account, instrument, Cheque details, and narration can change
without resetting allocation. A snapshot-mode update sends the stored
settlement IDs and settled amounts unchanged. It uses the Receipt detail's
`updated_at` as `expected_updated_at`; no Edit UUID or request fingerprint is
created. For a Cheque Receipt with no stored cheque date, or when the user
changes Edit to Cheque, the form defaults that date to the device's local
current date.

## Reviewing and changing Receipt allocation

Pressing **Change Allocation** on the Edit form navigates directly to
`receipt-edit-allocation` without showing a warning or requesting current
balances. In snapshot mode that screen renders only `historicalSettlements`.
It does not show current Outstanding bills, selection controls, amount inputs,
or ordering actions. The party summary and **Allocated Bills** heading stay
fixed; only the historical bill-card list scrolls. Back returns to the Edit
form without changing state.

The snapshot allocation screen has one fixed **Change Bill Allocation** action.
That action opens the existing reset-warning sheet. Cancelling keeps the same
historical screen and does not make an API request. Continuing calls:

```text
GET /api/cash-transactions/:id/edit-allocation-availability
```

Only a successful response switches the state permanently to `reallocation`.
The response's `expected_updated_at` replaces the detail version for the final
PUT. `original_allocations` become the initial selected amounts, and `items`
are retained as Edit-only server data. The client never recalculates
`editable_available` from `current_pending`.

The mounted allocation screen changes in place from historical review to the
editable allocation UI; it is not closed and reopened. A shared
`useReceiptEditReallocation` hook performs the availability request, validates
the Receipt and party, and dispatches the single Redux transition for both
entry paths.

The Receipt Amount field on the main Edit form is read-only. To change it, the
user opens the allocation review screen, explicitly chooses **Change Bill
Allocation**, and then changes the amount in editable reallocation mode after
current availability has loaded.

`receipt-edit-allocation` does not use the normal Outstanding query. It adapts
each server `editable_available` value to the existing Receipt allocation
helpers, preserves the current Receipt allocations on first entry, and allows
bills to be selected, removed, and replaced while keeping FIFO priority.
Selecting a bill uses the existing
`min(remaining Receipt amount, available amount)` rule.
Changing amount after entering this mode does not show the warning again. It
reselects all available Edit bills from oldest to newest, so newly eligible
bills are automatically included when the amount grows.

Editable Receipt Edit bills reuse the same card as Receipt Create. The three
displayed values are **Pending** (`editable_available`), **Settled** (the
current Edit allocation), and **Balance** (Pending minus Settled). Historical
snapshot cards keep their separate point-in-time labels.

Back retains in-progress allocation rows. Confirm validates every selected row
against `editable_available`, marks the allocation confirmed, and returns to
the Edit form. The allocation route never submits the Receipt.

## Receipt Edit update and concurrency

The final request is:

```text
PUT /api/cash-transactions/:id
```

Snapshot mode builds the complete settlement list from stored historical rows.
Reallocation mode builds the complete replacement list from confirmed current
allocations. Neither payload contains settlement subdocument IDs, party
changes, voucher identity changes, request IDs, or client-side accounting
writes.

HTTP 409 is never retried. A **Receipt Changed** sheet requires Reload, which
refetches Receipt detail, clears availability and local allocation edits,
returns to snapshot mode, and updates `expected_updated_at`.

When a Sale that was originally settled by this Receipt is later cancelled,
the backend keeps that Sale Outstanding as an active CR row until the Receipt
is changed or cancelled. During **Change Bill Allocation**, the backend may
remove this Receipt's historical contribution from that row only when the
current negative balance is exactly explained by the original settlement. Its
restored value is then zero, so it is a reversal target rather than an
allocatable bill and does not appear in the current DR-bill list. The Receipt
can be reallocated FIFO to other current bills, or its unallocated amount
becomes the normal Receipt advance. A remaining negative balance after removing
this Receipt's contribution is still rejected rather than guessed at.

On success the returned Receipt replaces the detail cache. Receipt, voucher,
Daybook, voucher totals, Outstanding, Party, and Cash/Bank keys are invalidated;
the Edit state is cleared and navigation returns to Receipt Detail. The
frontend never edits ledger or advance records.

## Receipt cancellation

Receipt Detail calls the existing backend endpoint:

```text
PUT /api/cash-transactions/:id/cancel
```

The native payload contains only `cmp_id`; it does not include calculated
settlement reversals, ledger movements, monthly balances, advance changes, or
timeline changes. The backend transaction remains the accounting authority.

The shared `VoucherCancellationSheet` requires an explicit destructive
confirmation and locks its buttons while the mutation is pending. The detail
screen also checks `receipt.status === "active"` before opening or submitting a
cancel request, so a directly opened cancelled Receipt cannot be cancelled or
edited.

On success, the returned Receipt updates the detail cache and the app
invalidates Receipt, voucher, Daybook, voucher-total, Outstanding, Party, and
Cash/Bank query keys. The screen remains on Receipt Detail and displays the
backend's cancelled status. If an Edit Redux session belongs to that same
Receipt, it is cleared; a different Receipt's Edit state is preserved.

Cancellation is deliberately not retried automatically. On an unknown network
result, or a 400/409 state response, the app refetches the Receipt first. When
the latest backend status is `cancelled`, the UI treats cancellation as
completed rather than inviting a second blind cancel. A receipt that remains
active shows the backend error and may be cancelled again by the user. This
also handles a Receipt cancelled while an Edit screen was open: the stale Edit
state is cleared after the cancelled record is observed.

The Edit form uses the same `KeyboardAvoidingView`, keyboard visibility state,
and narration scroll-to-end behavior as Receipt Create so the multiline field
remains visible above the keyboard.

## Draft and request-id lifecycle

Redux Toolkit owns the active Receipt draft. A draft is scoped to one company
and one logical Receipt attempt. Initializing the same company retains the
request id and values; changing company creates a clean draft. Party and amount
changes clear allocations and reset allocation status.

Back from Sale, Sale Order, or an editable `receipt-create` draft, including a
native back gesture, opens a confirmation sheet explaining that the draft will
be cleared. An uncertain Receipt can also be left immediately: its active Redux
form is discarded while its exact frozen payload stays in shared Pending
Submission storage. Reopening Receipt Create therefore starts a clean draft
with a fresh UUID, rather than restoring and locking the earlier Receipt.

Allocation status is a simple union:

```text
not_started -> no retained allocation
in_progress -> consistent rows retained through Back, but not confirmed
confirmed   -> rows and pagination state were validated explicitly
```

One UUID is generated outside Redux when the logical draft starts. Confirmation and
Save never generate a request id. The id stays unchanged through refresh,
freeze, timeout, app restart, and retry. A new id is created only after the old
draft is completed/cleared and a new logical Receipt begins.

After a confirmed 201 create or 200 idempotent replay, Receipt Create clears
both the Redux draft and its screen-local initialization reference before
navigation. Clearing the reference matters because the screen can briefly
render again before navigation completes; retaining it would recreate the
successful UUID in the next fresh draft.

Changing company or logging out clears the in-memory draft. Persisted uncertain
submissions are keyed by both user and company, so they cannot be replayed from
another authentication/company scope. The shared reconciler emits a local
resolution event only when read-only verification matches the current Receipt
to its frozen payload; the screen then clears its frozen form so it cannot
post the resolved request again.

## Shared pending submission migration

Before the Receipt POST, `receipt-create.tsx` freezes the exact final
payload, saves a `transactionType: "receipt"` PendingSubmission, then sends the
POST. Confirmed 201 creation and 200 idempotent replay remove that record.
Definite non-408, non-authentication 4xx failures remove it and unlock the
active form; 409 marks it `conflict`; 401, 403, timeout, network, 408, and
unknown 5xx outcomes remain
`uncertain`. No background code performs a Receipt POST.

Older device records using `receipt-submission-recovery-v1` are migrated once
into shared storage when a ready user/company is reconciled (and again safely
when Receipt Create opens). Valid records retain their original request ID and
payload, then the old key is removed. Malformed legacy entries are retained and
never converted into fabricated accounting data.

## Party, instrument, and account rules

- The payer must have `partyType = "party"`.
- Cash requires a `partyType = "cash"` account.
- Cheque, UPI, NEFT, and RTGS require a `partyType = "bank"` account.
- Cheque requires a non-empty number and valid date.
- Moving between Cash and bank instruments clears an incompatible account.
- Leaving Cheque clears its Cheque-only fields.

The frontend validates these rules for usability; the backend validates them
again and remains authoritative.

## Outstanding allocation

Receipt allocation requests:

```text
GET /api/outstanding/party/:partyId
classification=dr
isCancelled=false
positiveOnly=true
```

The customer header never totals the pages already rendered in the bill list.
Its gross `Total outstanding` is the server-provided Party `totalReceivable`
(the open DR bucket saved with the selected Party). The Party detail request
refreshes the net balance, displayed separately as `Net after customer credits`.
This makes customer CR/advance credits visible without reducing the gross debit
amount being allocated. If either server field is unavailable, the UI says so
instead of displaying a fabricated zero.

Receipt allocation uses one non-paginated request with `all=true`. The backend
keeps its existing default pagination for all other callers, but this explicit
flag returns every eligible bill in oldest-first order. Automatic allocation
therefore applies only after the complete bill list is available:

```text
remaining = receipt amount
for each eligible bill:
    settled = min(bill pending, remaining)
    remaining = remaining - settled
```

After a manual selection change, redistribution uses only selected bills and
does not silently reselect excluded bills. Duplicate ids, zero/negative rows,
or total settlement above the Receipt amount are invalid.

A remaining amount is treated as an advance preview only after this complete
request succeeds. Loading, empty, and initial error states are explicit; there
is no Load More control or pagination retry state on this screen.

Back stores displayed rows as `in_progress`. Confirm revalidates context, query
state, pagination, ids, amounts, and pending balances, then stores rows as
`confirmed`. A small confirmation snapshot is retained beside each allocation:
Outstanding id, settled amount, pending amount, bill number, and bill date.
Complete Outstanding documents remain in TanStack Query.

## Create preconditions and first-save refresh

Create Receipt requires a matching selected company, valid request id/date/series,
eligible customer, positive amount, compatible account, valid Cheque fields,
and `allocationStatus = confirmed`. It also checks unique ids, positive rows,
and that total settlement does not exceed the Receipt.

A full advance with an empty settlement list is valid only after allocation was
explicitly confirmed with completed Outstanding loading.

Before the first POST, the app reads every current eligible Outstanding page
through the existing service. Every selected bill must still exist and its
pending amount must equal the amount captured at confirmation. A changed or
missing bill is never silently adjusted: the draft returns to `in_progress`,
allocation opens, and the user must review and reconfirm.

This authoritative refresh runs only before first submission. It never runs
for an uncertain retry because rebuilding then could change a request that
already reached the backend.

## Canonical create payload

`buildReceiptCreatePayload` in `src/utils/receipt.ts` is the single payload
builder. It creates:

```ts
{
  cmp_id,
  request_id,
  voucher_type: "receipt",
  series_id,
  date,
  party_id,
  party_name,
  cash_bank_id,
  cash_bank_name,
  cash_bank_type,
  instrument_type,
  amount,
  settlement_details: [
    { outstanding: string, settled_amount: number }
  ],
  narration,
  cheque_number,
  cheque_date
}
```

Settlement confirmation snapshots never enter the request. The client does not
send bill number/date, previous pending, remaining pending, settlement date, or
any client-authored accounting document.

The voucher number shown before Save is a preview. The backend issues and
increments the final number transactionally.

## Save, freeze, and idempotency

The direct Create Receipt sequence is:

```text
Validate confirmed draft
  -> refresh all authoritative Outstanding pages
  -> reject stale allocation when needed
  -> build canonical payload once
  -> store exact payload in Redux submittedPayload
  -> persist recovery envelope
  -> POST /api/cash-transactions
```

While `submittedPayload` exists, reducers reject accounting-field edits. The
Save button uses a synchronous ref guard plus mutation pending state, so rapid
taps cannot create concurrent requests.

Backend outcomes:

- HTTP 201: new Receipt created; success.
- HTTP 200 and `idempotent_replay: true`: earlier identical request found;
  success.
- HTTP 409: the request id was used with different accounting input; retain the
  frozen payload and show conflict.
- A definitive non-timeout, non-authentication 4xx validation response: the
  request was rejected; clear the freeze so the user can correct the normal
  draft. HTTP 401 or 403 remains `uncertain`, preserving the exact request for
  scoped recovery after access is restored.
- Timeout, transport failure, HTTP 408, or server failure: outcome is uncertain;
  retain the exact payload and offer Retry Same Receipt.

Retry stores and posts the exact same body and request id. It does not refresh
Outstanding, rebuild settlement rows, or generate a UUID.

## Durable recovery

`@react-native-async-storage/async-storage` stores only the minimum unresolved
submission envelope:

```text
version
userId
companyId
seriesName (display only)
exact frozen payload
submission state (submitting / uncertain / conflict)
savedAt
```

Keys contain user and company scope. Parsed records must match both scopes and
the payload company. Malformed or cross-scope records are ignored. No complete
Party/Outstanding lists, loading state, errors, or React Query cache are
persisted.

Recovery is written before every POST. On restart, a stored `submitting` state
is treated as `uncertain`, and Redux is reconstructed from the immutable body as
a locked retry-only draft. Create displays Resume Submission instead of making
a replacement request.

Header Back and Android hardware Back preserve in-progress allocation without
marking it confirmed. Leaving the active Create screen never discards a frozen
submission; Create Receipt offers Retry Same Receipt. Confirmed success removes
the scoped AsyncStorage record.

## Success, navigation, and cache invalidation

The create response is read from `data.cashTransaction`; its `_id` is the real
Receipt id and its `voucher_number` is final. The mutation seeds the
company-scoped Receipt-detail cache.

After either 201 or 200 success, the app:

1. Removes the scoped recovery record.
2. Invalidates Receipt, voucher list, company Daybook, company voucher totals,
   Receipt voucher-series, Outstanding, Party, and Cash/Bank query keys.
3. Clears the completed Redux draft.
4. Replaces Create Receipt with `/receipt-detail?id=<backend Receipt id>`.

Replacing the route prevents Back from reopening the completed Receipt draft. The
Cash/Bank key covers balances and account transaction histories. Outstanding
and Party invalidations make those screens fetch current backend state.

## Backend accounting behavior

The backend transaction reloads and validates settlements, creates the Receipt,
issues the final voucher identity, reduces debit Outstanding rows, creates a
credit Outstanding for advance, posts PartyLedger and CashBankLedger, updates
PartyMonthlyBalance, and writes VoucherTimeline. Receipt cash movement is
always CashBankLedger direction `in`.

The mobile app never performs those writes directly.

## Remaining boundaries

The native Receipt flow still does not implement:

- Receipt detail redesign;
- Payment;
- Tally lifecycle;
- applying advances to future Sales;
- backend accounting changes or a new generic transaction framework.
