# Sale Creation Flow

## Current Phase

Narration UI is implemented as a small, optional Sale-create phase. The
existing product, despatch, additional-charge and summary behaviour remains
unchanged. Sale payload construction and submission remain intentionally out of
scope.

## Screen Flow

`/sale-create` starts a session-only Sale draft for the selected company. The
screen lets the user select a date, voucher series and customer, then browse
saleable products, select an exact godown stock row, edit the line and commit
the staged basket to Redux.

## Web And Backend References

* `/Users/midhun/Developer/erp_v2/erp_v2/frontend/src/pages/sales/SaleOrderCreatePage.jsx`
* `/Users/midhun/Developer/erp_v2/erp_v2/frontend/src/store/slices/transactionSlice.js`
* `/Users/midhun/Developer/erp_v2/erp_v2/frontend/src/pages/cashTransaction/CashTransactionScreen.jsx`
* `/Users/midhun/Developer/erp_v2/erp_v2/backend/Model/Sale.js`
* `/Users/midhun/Developer/erp_v2/erp_v2/backend/Model/ProductSchema.js`
* `/Users/midhun/Developer/erp_v2/erp_v2/backend/controllers/productController.js`

The Sale model confirms common header fields: company, series, date, party and
tax type. It also requires per-item godown, godown stock-row and optional batch
information, so its item flow cannot reuse the Sale Order item model.

## Shared Components

The screen reuses the voucher header, date picker, voucher-series selector and
modal, party selector and modal, and voucher loading/error/empty states.

## Redux State

`saleDraft` holds header fields, the selected price level, Sale item snapshots
and calculated item totals. A Sale line stores a unique draft-line ID, product
ID, pricing/tax inputs and the required godown, stock-row and batch snapshots.
The selected stock-row balance is stored only for local draft reservation; no
server product stock is changed.

It also holds optional despatch details, confirmed additional-charge snapshots,
derived additional-charge totals and narration. A centralized draft
recalculation first calculates Sale item totals, then calculates charge totals
from the current item total. Changing party/tax type recalculates both so an
IGST versus CGST/SGST change cannot leave stale values in the draft.

The Sale screen reuses the Sale Order additional-charges component directly.
It loads company-scoped charge masters through React Query only after items
exist, then saves confirmed charge snapshots into `saleDraft`. The Sale summary
shows item total, signed additional charges and final amount from derived state.

It also reuses the Sale Order despatch-details section and edit modal directly,
placed after party selection and before items. All eight optional despatch
fields are saved to `saleDraft.despatchDetails`; no extra Sale-specific
validation or date handling is needed.

## Narration UI

`SaleNarrationSection` is placed after Additional Charges and before Summary.
It is a controlled multiline input: its value comes directly from
`saleDraft.narration`, and every change dispatches `setSaleNarration`. The
clear action dispatches an empty string, so an empty narration remains `""` in
the frontend draft. Narration is optional and has no validation or financial
effect. `resetSaleDraft` and a company change already reset it to `""`.

The cash-transaction web screen is the reference for the optional narration
presentation. Its payload normalizes narration with `narration.trim() || null`;
that normalization is deliberately not implemented for Sale until the separate
payload phase.

## Product Adding And Stock Rules

`SaleProductSelectionModal` reuses the existing paginated product query,
debounced search, filters, detail cache, price-level query and initial-price
priority used by Sale Order. A product is selectable only when at least one
`GodownList` row exists. Negative stock is intentionally allowed, so remaining
stock is displayed as information and never disables an allocation row.

The allocation sheet keeps the user in the stock-selection context: every row
has minus, quantity, plus and Edit controls, and one Add to cart action commits
all non-zero row quantities together. Edit opens the existing item-edit sheet
for that exact product and stock row. Saving keeps its selling configuration
and quantity local to the allocation row; only Add to cart stages the line.
Each row displays its effective Sale rate and its calculated line total instead
of the stock-row MRP.

Availability is `balance_stock` minus the sum of `actualQty` reserved by staged
lines with the same `godownStockRowId`. It may become negative because Sales
are allowed to exceed the displayed stock balance. Products are never globally
marked as added.

Lines merge only when both the stock source and the required selling
configuration match. Calculated monetary fields are not merge keys and are
recalculated after every merge. Godown names are shown only when the API
provides a populated godown object; the UI does not invent a name.

## Draft Lifecycle

Opening Sale starts a clean draft when the company changes. A fresh voucher
series response validates the selected series and chooses the server default
when necessary. Leaving the screen, selecting no company, changing company, or
logging out clears the Sale draft. No draft is persisted to device storage.

## API, Validation And Submission

The screen reads the existing voucher-series, party, product, price-level and
pricing APIs. No Sale payload, create mutation or product-stock mutation exists
in this phase. The Create button remains disabled.

## Next Phase

Perform the final Sale frontend completeness review. Sale payload mapping,
submission and backend work remain separate, unapproved phases.
