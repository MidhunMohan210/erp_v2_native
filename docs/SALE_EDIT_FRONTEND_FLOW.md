# Sale edit frontend flow

## Screen flow

`Sale Detail` shows Edit only for an active, `pending` Sale. It opens
`/sale-create?id=<saleId>&mode=edit`. The shared Sale screen fetches the full
Sale detail, then initializes a fresh Redux edit draft. Loading and request
errors are shown before the form becomes available.

The voucher number and series are displayed read-only in edit mode. The date,
party, despatch details, products, additional charges, and narration use the
same mobile controls as Sale Create.

## Web and backend references

- `/Users/midhun/Developer/erp_v2/erp_v2/backend/routes/sale/saleRoute.js`
- `/Users/midhun/Developer/erp_v2/erp_v2/backend/controllers/saleController.js`
- `/Users/midhun/Developer/erp_v2/erp_v2/backend/services/sale.service.js`
- `/Users/midhun/Developer/erp_v2/erp_v2/backend/services/saleFoundation.service.js`
- `/Users/midhun/Developer/erp_v2/erp_v2/frontend/src/pages/sales/SaleOrderEditPage.jsx`

The Sale Order page is used only for the existing mobile-edit pattern. Sale
uses its own endpoint and Sale-specific godown stock contract.

## Draft state and item identity

`saleDraft.editingSaleId` identifies an edit draft. `loadSaleForEdit` replaces
the previous draft instead of merging it, and ignores background refetches once
the same Sale is being edited.

Existing items retain their backend `_id` and use it as their frontend `id`, so
two rows for the same product are still separate. New rows receive the current
frontend temporary `id` only. The UI never sends that temporary key as a Sale
item identity.

`actualQty` and `billedQty` are mapped separately. In Sale edit mode, changing
actual quantity in the item editor does not silently overwrite billed quantity.

## API and payload

- Detail: `GET /api/sales/:id` with the active company query parameter.
- Update: `PUT /api/sales/:id` with `X-Company-Id`.

Update uses the same normalized fields as create except for `request_id` and
`selectedSeries`. Existing items include `saleItemId`, sourced from the saved
item `_id`; new items omit it. Removed rows are simply absent from `items`.
The backend accepts `saleItemId` (and also `_id`) and performs stock, ledger,
monthly-balance, party/cash-bank, and outstanding transitions itself.

## Validation and outcomes

The frontend requires a company, date, party, at least one item, valid
product/godown/stock-row identities, positive actual and billed quantities, and
valid rates. It does not calculate or submit outstanding, ledger, stock, or
voucher-identity fields.

On success the Sale detail cache is replaced and Sale, product, party, Daybook,
and Sale voucher-list queries are invalidated; the draft is cleared and the app
returns to Sale Detail. On failure the Redux edit draft remains available for
correction. Mutation retries are disabled to avoid repeating a transactional
update automatically.
