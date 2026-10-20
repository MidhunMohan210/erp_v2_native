# Sale Order Create Flow

This document describes the approved native Sale Order Create recovery phase.
Sale Order Edit, cancellation, Daybook Pending UI, and automatic POST retry are
outside this phase.

## Web and backend references

The native flow follows:

- `erp_v2/backend/services/saleOrder.service.js`
- `erp_v2/backend/controllers/saleOrderController.js`
- `erp_v2/backend/tests/sale_order/saleOrder.route.test.js`
- `src/services/saleOrder.service.ts`
- `src/app/sale-order-edit.tsx`

The backend is authoritative for final numbering and the unique
`cmp_id + request_id` idempotency rule. It returns 201 for a new order, 200 for
an identical replay, and 409 if a request ID is reused with different input.

## Create and retry flow

```text
Validate draft
  -> build final POST body once
  -> freeze it in Redux
  -> save shared PendingSubmission
  -> POST /api/sale-orders
```

The exact result of `buildCreateSaleOrderPayload` is stored in
`voucherDraft.submittedPayload` and in the shared pending store before POST.
Retry Sale Order sends that saved body unchanged; it does not rebuild quantities,
rates, taxes, pricing, product selection, or dispatch data.

While the payload is frozen, voucher-draft reducers and Sale Order Create
controls reject edits. The synchronous submit ref and React Query `retry: false`
prevent duplicate automatic POSTs.

## Recovery outcomes

- 201 and idempotent 200: remove the pending record, reset the draft, invalidate
  Sale Order/Daybook/series totals, and navigate using the existing success UX.
- Normal non-408, non-authentication 4xx: remove the pending record and unlock
  the editable draft. HTTP 401 or 403 remains `uncertain` for scoped recovery
  after the same user regains company access.
- 409: preserve the exact payload as a `conflict`; no new request ID is made.
- Timeout, network failure, 408, and unknown 5xx: preserve it as `uncertain`
  and show **Retry Sale Order**.

The durable record is user/company scoped under `sale-order:<request-id>`. If
the user leaves an uncertain Create screen, the active Redux draft resets but
the stored record remains independently recoverable. Reopening Create starts a
clean draft and a fresh UUID.

The global read-only reconciler verifies the existing Sale Order against its
request ID and frozen payload. Only a fingerprint match removes shared storage and emits a
resolution event; the open Create screen clears its frozen form. It never POSTs.

## Edit boundary

`src/app/sale-order-edit.tsx` keeps its existing PUT-only workflow. It does not
create pending submissions, freeze Create bodies, or use Create retry logic.
