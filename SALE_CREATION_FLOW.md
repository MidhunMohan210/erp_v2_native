# Sale Creation Flow

## Current Phase

The outer Sale create screen is implemented. Sale item entry, calculations,
payload construction, submission and editing are intentionally not implemented.

## Screen Flow

`/sale-create` starts a session-only Sale draft for the selected company. The
screen lets the user select a date, voucher series and customer, then displays
the Sale items boundary and a zero-value summary.

## Web And Backend References

* `/Users/midhun/Developer/erp_v2/erp_v2/frontend/src/pages/sales/SaleOrderCreatePage.jsx`
* `/Users/midhun/Developer/erp_v2/erp_v2/frontend/src/store/slices/transactionSlice.js`
* `/Users/midhun/Developer/erp_v2/erp_v2/backend/Model/Sale.js`

The Sale model confirms common header fields: company, series, date, party and
tax type. It also requires per-item godown, godown stock-row and optional batch
information, so its item flow cannot reuse the Sale Order item model.

## Shared Components

The screen reuses the voucher header, date picker, voucher-series selector and
modal, party selector and modal, and voucher loading/error/empty states.

## Redux State

`saleDraft` holds only the confirmed header fields: company ID, transaction
date, selected series, selected party and derived tax type. It holds no item,
total, price-level or additional-charge data yet.

## Draft Lifecycle

Opening Sale starts a clean draft when the company changes. A fresh voucher
series response validates the selected series and chooses the server default
when necessary. Leaving the screen, selecting no company, changing company, or
logging out clears the Sale draft. No draft is persisted to device storage.

## API, Validation And Submission

The screen reads only the voucher-series and party APIs through existing shared
components. No Sale payload or create mutation exists in this phase. The Create
button remains disabled because Sale item selection and calculations are not
implemented.

## Next Phase

Define the Sale product, godown, stock-row and batch-selection contract before
adding a Sale item type, calculations, payload mapping or submission.
