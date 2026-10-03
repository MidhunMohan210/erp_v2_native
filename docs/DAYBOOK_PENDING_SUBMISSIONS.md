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
- `conflict`: request ID/fingerprint mismatch; it shows needs attention and no
  blind Retry.
- `rejected`: a definite 4xx occurred after the original Create form was gone;
  the record remains visible for attention rather than being silently deleted.

## Display and scope

`pendingSubmissionDisplay.service.ts` has small Receipt, Sale, and Sale Order
adapters. Each reads only fields available in its own stored request shape.
Sale Create stores a party ID rather than a display snapshot, so the card uses
that identifier when no customer name exists; it does not invent accounting
amounts or voucher numbers.

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

The global reconciliation coordinator uses the same storage. A background FOUND
event removes the record and emits a storage change, so an open Pending list
loses the card without being reopened. The confirmed voucher is then available
only through normal backend Daybook data after invalidation.
