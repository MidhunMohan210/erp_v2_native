# Receipt Flow

This document describes the React Native Receipt flow through Phase 4E.

## Web and backend references

The native implementation was checked against:

- `frontend/src/utils/calculateAutoSettlement.js`
- `frontend/src/pages/cashTransaction/CashTransactionScreen.jsx`
- `frontend/src/hooks/useCashTransactionDraft.js`
- `backend/controllers/cashTransactionController.js`
- `backend/services/cashTransaction.service.js`
- `backend/services/cashTransactionDocument.service.js`
- `backend/schemas/CashTransactionSchema.js`
- `backend/Model/Receipt.js`
- `backend/tests/cash_transactions/receipt.route.test.js`

The backend remains the only writer for Outstanding, PartyLedger,
PartyMonthlyBalance, CashBankLedger, advance Outstanding, voucher numbering,
and VoucherTimeline.

## Screen flow

```text
Receipt Create
  -> Outstanding Allocation
  -> Confirm Allocation
  -> Create Receipt confirmation sheet
  -> Confirm & Create or Retry Same Receipt
  -> Receipt Detail
```

There are two primary screens: `receipt-create` and `receipt-allocation`.
`receipt-create` owns the date, Receipt series, customer, settlement entry
point, instrument, Cash/Bank account, optional Cheque details, narration, and
the final confirmation sheet. It reuses shared voucher date, series, Party,
loading, error, and empty-state components.

`receipt-allocation` owns the Receipt amount input and shows the customer,
paginated eligible bills, oldest-first allocation, manual selection, settlement
totals, and confirmed advance. It opens after customer selection even when no
amount has been entered. Changing the Redux amount immediately clears manual
choices and reapplies the existing oldest-first allocator. Confirm returns to
the form.

The allocation screen has three mobile regions: a fixed customer/progress
header with the amount input immediately below it, one virtualized bill list as
the only scrolling region, and a fixed compact allocation footer with Confirm.
The footer shows allocated and advance values without duplicating the detailed
summary retained on Receipt Create.

The Create Receipt button opens a compact bottom sheet, not a third route. It
shows customer, date, amount, allocated amount, advance, payment method,
received-into account, and Cheque details when relevant. Cancel makes no API
call. Its review details scroll independently above a fixed Cancel and
Confirm/Create footer. A frozen submission makes the sheet retry-only.

## Draft and request-id lifecycle

Redux Toolkit owns the active Receipt draft. A draft is scoped to one company
and one logical Receipt attempt. Initializing the same company retains the
request id and values; changing company creates a clean draft. Party and amount
changes clear allocations and reset allocation status.

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

Changing company or logging out clears the in-memory draft. Persisted uncertain
submissions are keyed by both user and company, so they cannot be replayed from
another authentication/company scope.

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

The infinite query follows backend page order, which is oldest first. Automatic
allocation applies:

```text
remaining = receipt amount
for each eligible bill:
    settled = min(bill pending, remaining)
    remaining = remaining - settled
```

After a manual selection change, redistribution uses only selected bills and
does not silently reselect excluded bills. Duplicate ids, zero/negative rows,
or total settlement above the Receipt amount are invalid.

An unloaded next page means a remaining amount is not yet proven to be advance.
If any amount remains, Confirm is blocked until all pages load successfully. A
fully allocated Receipt can confirm without loading irrelevant later pages
because its advance is already zero. Loading, empty, initial error, next-page
error, and retry states are explicit.

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

The Confirm & Create sequence is:

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
- A definitive non-timeout 4xx validation response: the request was rejected;
  clear the freeze so the user can correct the normal draft.
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
marking it confirmed. Dismissing the confirmation sheet never discards a frozen
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

## Phase 4F boundary

Phase 4E intentionally does not implement:

- Receipt edit;
- Receipt cancellation UI;
- Receipt detail redesign;
- Payment;
- Tally lifecycle;
- applying advances to future Sales;
- backend accounting changes or a new generic transaction framework.
