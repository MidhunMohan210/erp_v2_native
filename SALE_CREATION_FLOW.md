# Sale Creation Flow

## Current Phase

Native Sale submission and the immediate post-create Sale detail view are
implemented. The existing product, despatch, additional-charge and narration
behaviour remains unchanged.

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
* `/Users/midhun/Developer/erp_v2/erp_v2/backend/controllers/saleController.js`
* `/Users/midhun/Developer/erp_v2/erp_v2/backend/services/sale.service.js`
* `/Users/midhun/Developer/erp_v2/erp_v2/backend/services/saleFoundation.service.js`

The Sale model confirms common header fields: company, series, date, party and
tax type. It also requires per-item godown, godown stock-row and optional batch
information, so its item flow cannot reuse the Sale Order item model.

## Shared Components

The screen reuses the voucher header, date picker, voucher-series selector and
modal, party selector and modal, and voucher loading/error/empty states.

## Redux State

`saleDraft` holds header fields, the selected price level, Sale item snapshots
and calculated item totals. It also holds the backend's exact `request_id` and
a session-only JSON signature of the first submitted payload (without that ID).
Those two fields stay together through an uncertain response so a retry sends
the same request identity. A Sale line stores a unique draft-line ID, product
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
`GodownList` row exists. Negative stock is allowed for Sale. Available stock is
informational only and does not restrict Sale quantity; it never disables an
allocation row or prevents a quantity from being saved.

Sale product-list requests pass `for_sale=true`, which lets the backend exclude
products without stock rows before pagination. This Sale-only query has its own
React Query cache key; Product Master continues using the normal unfiltered
product list. The Sale detail request supplies the selected company ID and uses
the returned `godown_name` only for display. `godown` and the stock-row `_id`
remain the stored `godownId` and `godownStockRowId` identities.

The allocation sheet keeps the user in the stock-selection context: every row
has minus, quantity, plus and Edit controls, and one Add to cart action commits
all non-zero row quantities together. Edit opens the existing item-edit sheet
for that exact product and stock row. Saving keeps its selling configuration
and quantity local to the allocation row; only Add to cart stages the line.
Each row displays its effective Sale rate and its calculated line total instead
of the stock-row MRP.

When a listed product has exactly one `GodownList` row, the product list uses
the Sale Order-style row controls instead of opening the allocation sheet. Its
minus, plus and Edit actions use that sole row's `godown`, stock-row `_id`,
batch and other stock snapshot fields, but retain them as a pending allocation.
The main sheet's Add to Cart action commits pending single-Godown allocations
through the same existing Sale merge helper used by the allocation sheet. View
Cart uses the same All products sheet as the Sale screen and therefore shows
only committed allocations. Products with more than one Godown continue to
open the unchanged allocation sheet.

Changing the price level never reprices committed Sale cart lines. If the
selector has pending single-Godown quantities or multi-Godown allocation
quantities, it asks for confirmation before clearing only those pending values
and applying the new price level. With no pending selection, the new level is
applied immediately. Cancelling retains both the current price level and every
pending allocation.

Add to Cart uses button-level feedback for both single- and multi-Godown
pending allocations. It prevents repeat presses while adding, shows an
"Adding..." state, then shows "Added to Cart" briefly after the existing
commit succeeds. The loading indicator remains visible for at least one second
so a fast local commit still has clear feedback. A failure keeps the pending
allocations available to retry.
The main product-list button and the Godown-sheet button keep separate local
feedback state: the Godown sheet remains open through its success feedback and
then closes, while the main sheet remains open and resets only its own button.
The scrollable product list uses the Sale Order-style rose product icon tile;
single-Godown rows also show the calculated pending line total beside their
quantity controls.

`actualQty` and `billedQty` are independent fields. Allocation controls and
availability use `actualQty`; financial previews and totals use `billedQty`.
New allocations initially default billed quantity to the selected actual
quantity. A direct Billed quantity edit does not change actual quantity, but a
later Actual quantity edit intentionally resets billed quantity to the new
actual value. Alternate quantities are calculated independently from their
corresponding base quantity.

The allocation row's `−` and `+` controls display billed quantity, matching
Sale Order. Because these controls change actual quantity, each tap sets billed
quantity to the resulting actual quantity.

Availability is `balance_stock` minus the sum of `actualQty` reserved by staged
lines with the same `godownStockRowId`. This is display-only information, not a
maximum quantity or validation rule. It may become negative because Sales are
allowed to exceed the displayed stock balance. Products are never globally
marked as added.

Lines merge only when both the stock source and the required selling
configuration match. Calculated monetary fields are not merge keys and are
recalculated after every merge. Godown names are shown only when the API
provides a populated godown object; the UI does not invent a name.

The Sale cart previews at most three allocations. Its Show all products action
opens a sheet containing every staged allocation, including the same Edit and
Remove actions. Saving an edit opened from that sheet returns to the sheet.

## Draft Lifecycle

Opening Sale starts a clean draft when the company changes. A fresh voucher
series response validates the selected series and chooses the server default
when necessary. Leaving the screen, selecting no company, changing company, or
logging out clears the Sale draft, including its `request_id`. No draft is
persisted to device storage.

## API, Validation And Submission

`buildSaleCreatePayload` in `src/services/sale.service.ts` is a pure mapper.
It sends only the client-owned JSON request contract to `POST /api/sales`: the
exact backend `request_id`, then the series ID, date, party ID, nullable
price-level ID, item inventory IDs and
inputs, confirmed charge master IDs/actions/values, trimmed despatch values and
optional trimmed narration. It deliberately sends `item.itemId` rather than
the Redux line `item.id`, and it does not send godown names, item tax snapshots
or any calculated totals.

Every selected additional charge stores `additionalChargeId` separately from
its draft-row `_id`. The Sale payload sends that master ID as
`additionalChargeId` and the current backend-compatible `chargeMasterId` alias;
it does not send the charge's calculated tax or total snapshots.

The currently deployed Sale route also runs company-access middleware before
the controller. That middleware requires a selected company identifier, even
though the controller derives the persisted company from request scope. Native
therefore sends the selected company in the supported `X-Company-Id` request
header, not as `cmp_id` in the JSON body.

The screen validates the selected company, series, date, party, at least one
item, each item's product/godown/stock-row/unit IDs, positive finite quantities
and finite rate, plus finite additional-charge values. The backend remains the
authority for live master records, stock-row validity, price levels and all
calculated values.

`useCreateSaleMutation` keeps pending/error mutation state in React Query,
while Redux keeps the retryable draft and its stable submission identity. The
Summary button is disabled while the mutation is pending, and a ref closes the
small gap before React Query can update that state after a rapid double tap.
The first valid submit generates a cryptographically secure UUID using
`expo-crypto`, stores it as `request_id`, and sends it in the payload. A failed
request leaves both the draft and ID untouched, so every user retry sends the
same ID. This mutation explicitly keeps React Query automatic retries disabled,
matching its prior default behavior, so failed requests currently wait for the
user to retry.

The backend is explicitly first-request-wins and does not compare a payload
fingerprint. Before any retry, native compares the current backend-relevant
payload with its first submitted payload signature. If the draft has changed,
it blocks submission and asks the user to restore the previous values or check
Daybook before creating a new Sale. This avoids silently treating a replay of
changed values as the original Sale, or creating a second Sale while the first
request may have committed. A successful response, including a backend replay,
uses the returned Sale normally: it invalidates product queries, the Sale
series query and the company's Daybook timeline cache (including Today's
Transactions), shows the returned voucher number, clears the Redux draft and
therefore its `request_id`, clears local modal state, then opens `/sale-detail`
for the returned Sale. The next new Sale has no ID until it is submitted, then
receives a newly generated UUID.
The full POST response is stored under a company- and Sale-specific React Query
key before navigation. The same key is used by the Sale detail query, which
refreshes from `GET /api/sales/:id`. This keeps the immediate post-create view
fast while allowing Daybook to open any persisted Sale by its ID.

## Sale Detail Screen

`/sale-detail` follows the Sale Order detail layout: header, disabled action
row, customer card, item cards, additional charges, saved calculation summary,
despatch details and narration. It renders only persisted Sale response values
and does not reuse the creation draft or recalculate totals.

The screen reads the Expo Router `id` parameter and uses React Query for the
company-scoped Sale detail request. It shows the shared page loader while that
request is pending and the shared retryable error state if the Sale is missing
or inaccessible.

Sale items show their saved godown plus optional batch, MRP and manufacturing
or expiry dates. Additional-charge, despatch and narration sections are hidden
when their saved values are empty. Edit, Print and Cancel are visible but
disabled, with no handler, navigation or API call.

## Next Phase

Sale edit, cancellation, printing and a Sale list remain intentionally out of
scope.
