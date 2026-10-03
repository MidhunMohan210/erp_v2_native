# Daybook Pending Submissions

Daybook has two separate views: **Transactions** shows only backend-confirmed
vouchers, while **Pending** shows local unresolved submission records for the
active authenticated user and company. Pending records are never added to
Daybook totals, accounting reports, voucher numbers, or normal filters.

## Visible states

- `uncertain`: unable to confirm yet; the user can use **Check status**.
- `checking`: a GET lookup is in progress or was interrupted; it remains safe
  to check again.
- `retry_available`: the server returned 404; **Retry** sends the exact saved
  body and request ID.
- `conflict`: request ID/fingerprint mismatch; it shows **View Existing** and
  **Dismiss**, never blind Retry. View Existing uses the original request ID
  to locate a possible existing backend voucher without changing this record.
- `rejected`: a definite 4xx occurred after the original Create form was gone;
  the user can choose **Create New** or **Dismiss**. Both are local cleanup
  actions and never call the backend.

## Display and scope

`pendingSubmissionDisplay.service.ts` has small Receipt, Sale, and Sale Order
adapters. Each reads only fields available in its own stored request shape.
Sale Create stores a party ID rather than a display snapshot, so the card uses
the existing party-detail query to show the customer name when available; it
does not invent accounting amounts or voucher numbers.

Records are read only through `listForUserAndCompany(userId, companyId)`. The
query key also contains both IDs, so switching user/company immediately uses a
separate list. Storage save/update/remove operations emit a lightweight change
event, keeping an open Pending list fresh after retries and reconciliation.

## Retry and checking

`pendingSubmissionRetry.service.ts` dispatches only by transaction type:

- Receipt → existing Receipt create API
- Sale → existing Sale create API
- Sale Order → existing Sale Order create API

It posts the stored `payload` exactly as saved and never opens a form,
generates a UUID, rebuilds calculations, or automatically retries. A per-record
in-flight guard prevents rapid double taps. Confirmed 201 and replay 200 remove
the local record; timeout/network/408/5xx outcomes remain `uncertain`; 409 is
`conflict`; a definite non-408 4xx becomes `rejected` because it cannot be
repaired safely without the old editable form.

**Check status** calls the existing reconciliation lookup only. It performs no
POST. Found records are removed; 404 becomes `retry_available`; unavailable
lookups remain `uncertain`.

## Rejected cleanup

**Dismiss** removes only the rejected PendingSubmission from shared local
storage. The normal storage-change event refreshes the visible Pending count;
no backend request is made and normal Daybook transactions are unaffected.

**Create New** first removes that same local record, clears the matching Redux
draft, then opens the standard Create route:

- Receipt → `/receipt-create`
- Sale → `/sale-create`
- Sale Order → `/sale-order-create`

The Create screens generate their normal fresh request IDs and do not receive
the rejected payload. Conflict remains separate: it has no Create New action
and never reuses the conflicting payload.

## Conflict actions

**View Existing** uses the existing company-scoped, read-only request-ID lookup
for the matching transaction type. A found result opens the current detail
route while retaining the local conflict record:

- Receipt → `/receipt-detail`
- Sale → `/sale-detail`
- Sale Order → `/sale-order-detail`

A 404, network failure, timeout, authentication error, or server error leaves
the conflict unchanged and lets the user try again later. It never performs a
POST or changes the backend transaction.

**Dismiss** asks for confirmation, then removes only the local conflict record
from shared storage. It does not delete, cancel, reverse, or otherwise modify
the existing backend transaction.

The global reconciliation coordinator uses the same storage. A background FOUND
event removes the record and emits a storage change, so an open Pending list
loses the card without being reopened. The confirmed voucher is then available
only through normal backend Daybook data after invalidation.
