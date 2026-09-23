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
the same Sale is being edited. When the edit route itself is removed without a
successful update, it resets the entire draft. This means reopening the Sale
always rehydrates its persisted backend state, while closing an in-route sheet
does not discard work.

Existing items retain their backend `_id` and use it as their frontend `id`, so
two rows for the same product are still separate. New rows receive the current
frontend temporary `id` only. The UI never sends that temporary key as a Sale
item identity.

`actualQty` and `billedQty` are mapped separately. In Sale edit mode, changing
actual quantity in the item editor does not silently overwrite billed quantity.

Each saved item retains the full combined GST rate for both supported tax
representations: IGST uses the full rate, while CGST and SGST each use half.
Changing Party therefore changes the GST allocation without silently changing a
saved item rate or dropping GST. Company and Party states are trimmed and
compared case-insensitively, matching the backend tax-mode rule. The selected
company Redux value normalizes `state` to a string during selection and secure
storage rehydration. When the company list loads, it refreshes an older saved
selection with the current API company record, so a missing field cannot
silently force the Sale to IGST.

Saved additional charges retain the rate fields from the Sale response too.
Their tax and display preview therefore use the historical Sale snapshot rather
than a later version of the Additional Charge master. The master is consulted
only when the user selects a new charge. On every Party change,
`setSaleParty` recalculates the full draft: item base price, discount, taxable
amount, active GST buckets, cess, line totals, additional charges, and all
summary totals. Inactive IGST or CGST/SGST amount buckets are reset to zero.
The calculation retains JavaScript precision internally; presentation formats
currency to two decimal places without rounding stored draft values.

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
