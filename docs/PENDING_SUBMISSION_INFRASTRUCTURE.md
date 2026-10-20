# Pending submission infrastructure

This document describes the shared native recovery layer for uncertain create
submissions. Receipt, Sale, and Sale Order Create now save their exact payload
before POST and use this layer for later reconciliation.

## Web references

- `backend/routes/cashTransaction/cashTransactionRoute.js` and
  `backend/controllers/cashTransactionController.js` define Receipt lookup at
  `GET /api/cash-transactions/by-request-id/:requestId`.
- `backend/routes/sale/saleRoute.js` and `backend/controllers/saleController.js`
  define Sale lookup at `GET /api/sales/by-request-id/:requestId`.
- `backend/routes/saleOrder/saleOrderRoute.js` and
  `backend/controllers/saleOrderController.js` define Sale Order lookup at
  `GET /api/sale-orders/by-request-id/:requestId`.
- `backend/utils/companyScope.js` confirms each lookup must include the active
  `cmp_id` and enforces company access server-side.

## Stored draft and scope

`PendingSubmission` stores a local `id`, transaction type, authenticated user
ID, selected company ID, backend request ID, the original create `payload`,
status, timestamps, and optional error metadata. `payload` is `unknown` because
each voucher type has a different request shape. This layer never changes it.

AsyncStorage keys are user scoped and versioned:

`erp.pending-submissions.v1:user:<encoded-user-id>`

Each key holds `{ version: 1, submissions: [...] }`. Records still include both
their user and company IDs, and every read validates the requested user ID.
Company filtering happens before a caller receives records, so one login cannot
read another user's pending operations. Malformed JSON, old versions, missing
fields, and individual corrupt records safely produce no usable record rather
than crashing the app.

Logical uniqueness is `userId + companyId + transactionType + requestId`.
Saving it again replaces that logical operation instead of adding a duplicate.
A duplicate local ID also replaces the earlier record, so one local row cannot
refer to two operations.

## Storage API

`pendingSubmissionStorageService` provides `save`, `getById`, `list`,
`listForUserAndCompany`, `update`, `remove`, `clearForUserAndCompany`, and
`clearForUser`. It serializes writes for the same user because AsyncStorage has
no transaction API.

## Reconciliation flow

Each voucher type has a small handler with only its verification path. The
generic manager chooses the handler, marks an `uncertain` or persisted
`checking` record as `checking`, and performs a read-only verification POST
with the original frozen payload. It never calls a voucher-create endpoint.

| Lookup result | Stored result |
| --- | --- |
| Verified fingerprint match | remove the pending record and return a resolution event |
| Request ID exists but fingerprint differs | `conflict`; preserve the pending record |
| Missing or unsafe legacy fingerprint | `uncertain`; preserve the pending record |
| 404 | `retry_available`; no retry POST is made |
| Timeout, offline error, 5xx, malformed response | `uncertain` with metadata and original payload preserved |
| 401 or 403 | `uncertain`; the pass stops and data is preserved |
| Existing `conflict` or `rejected` | preserved and reported without lookup |

A previously persisted `checking` status is checkable on the next pass, so an
app crash cannot leave it stuck. An in-memory map shares concurrent work for
the same local record, preventing duplicate lookup requests from overlapping
future foreground/reconnect triggers.

The manager returns `resolved`, `retryAvailable`, `stillUncertain`, and
`conflicts`. A later coordinator may use `resolved` events to invalidate
Receipt, Sale, Sale Order, or Daybook queries. This manager has no UI,
navigation, QueryClient, AppState, or NetInfo dependency.

## Daybook Pending view

Daybook's Pending tab reads only local unresolved records for the active user
and company. It never contributes to backend Daybook entries or totals. See
`DAYBOOK_PENDING_SUBMISSIONS.md` for its status, retry, and check behavior.
Storage updates emit a lightweight in-memory change event so open Pending views
refresh after a retry, a manual check, or background reconciliation.

## Automatic reconciliation triggers

The second phase mounts `PendingSubmissionReconciliationCoordinator` once in
`src/app/_layout.tsx`, beneath Redux and the shared React Query provider. It
does not know voucher screen details; it only supplies the active authenticated
user and selected company to the shared reconciler.

`@react-native-community/netinfo` supplies connectivity hints. The coordinator
checks once on startup and triggers only on an offline-to-online transition. It
does not poll, and repeated online events do nothing. React Native `AppState`
triggers only when `background` or `inactive` returns to `active`.

The coordinator also triggers when hydration first produces an authenticated
user and selected company, and whenever that company changes. A company switch
does not clear the prior company's pending records; only the new company ID is
passed to reconciliation. Logout leaves records in their user-scoped storage
but prevents later automatic runs until the same user is authenticated and has
selected the original company. A 401 or 403 stays `uncertain`; it does not
remove the original request ID and payload or trigger an automatic POST retry.

An in-memory active-run promise coalesces overlapping ready, online, and
foreground signals. NetInfo is only a hint: backend or lookup failure is still
handled by the existing `uncertain` result logic.

When a lookup finds a committed voucher, the coordinator invalidates only the
matching Receipt, Sale, or Sale Order query family plus that company's Daybook
key. This is safe now because the root provider was changed to use the shared
`src/lib/queryClient.ts` instance already used by the API/logout path. No broad
query-cache clearing or navigation is performed.
