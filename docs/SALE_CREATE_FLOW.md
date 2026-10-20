# Sale Create Flow

This document describes the approved native Sale Create recovery phase. It does
not change Sale Edit, Sale Order, Cancel, or Daybook Pending UI.

## Web and backend references

The native flow follows these existing Sale rules:

- `erp_v2/backend/services/sale.service.js`
- `erp_v2/backend/tests/sale/sale.idempotency.test.js`
- `src/services/sale.service.ts`
- `src/hooks/queries/saleQueries.ts`

The backend owns Sale accounting, stock updates, final voucher numbering, and
the unique `cmp_id + request_id` idempotency rule. The mobile client only builds
the request and never reserves a final voucher number.

## Create flow

```text
Validate Sale draft
  -> build final Sale POST body once
  -> freeze that body in Redux
  -> save shared PendingSubmission
  -> POST /api/sales
  -> remove pending record on confirmed success
```

`src/app/sale-create.tsx` uses `buildSaleCreatePayload` as the single create
payload mapper. It writes the exact resulting body to both
`saleDraft.submittedPayload` and the shared pending-submission store before the
POST starts. A manual Retry posts that same saved body and request ID; it does
not read mutable item, party, price-level, or additional-charge values.

The synchronous ref guard and the React Query mutation's `retry: false` setting
prevent automatic or rapid duplicate POSTs. Shared reconciliation remains
read-only and never calls the Sale create endpoint.

## Draft and storage state

The active form lives in Redux. Its relevant create-only fields are:

- `request_id`: the logical Sale request ID.
- `submittedPayload`: the exact frozen `CreateSalePayload`, or `null`.
- `submissionRecoveryState`: `submitting`, `uncertain`, `conflict`, or `null`.

While a frozen payload exists, Sale Create reducers reject form edits and the
screen disables the relevant controls. A definitive rejection clears only the
frozen body, making the normal draft editable again. Leaving the screen clears
the active Redux draft as before, while the durable shared record remains for
safe background lookup.

`src/services/pendingSubmissions/salePendingSubmission.service.ts` stores the
record under `sale:<request_id>`, scoped by user and company. It preserves the
first payload and timestamp when Retry saves it again.

## Outcomes

- HTTP 201 creates a Sale; remove pending storage, clear the draft, invalidate
  current product/party/outstanding/cash-bank/series/Daybook data, and navigate
  to the Sale detail screen.
- HTTP 200 with `idempotent_replay` follows the same cleanup and navigation.
- A non-408, non-authentication 4xx rejection removes the pending record and
  unlocks the draft. HTTP 401 or 403 remains `uncertain` so the exact request
  can be reconciled after the same user regains company access.
- HTTP 409 marks the record as `conflict`; it remains frozen and no new request
  ID is generated automatically.
- Timeout, network failure, HTTP 408, and unknown 5xx failures remain
  `uncertain` and show **Retry Sale** on the current screen.

When the shared reconciler later verifies this Sale's request ID and frozen
payload fingerprint, it removes the pending record and emits a resolution event. An active matching Sale Create
screen clears its frozen form and informs the user. Reconciliation never POSTs.

## Sale Edit boundary

`mode=edit` or an existing Sale ID uses the existing PUT-only
`handleUpdateSale` path. It neither creates a pending Sale record nor uses the
frozen Create payload.
