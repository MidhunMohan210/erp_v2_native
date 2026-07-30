# Sale Order Creation and Edit Flow

## Implementation status

Phase 14 is complete. The native flow currently supports:

1. Opening Create Order from the home screen
2. Fetching sale-order voucher series for the selected company
3. Choosing the API default or first available series
4. Displaying the next voucher-number preview
5. Changing the series in a reusable selection modal
6. Keeping the confirmed voucher context and series in Redux during the current
   app session
7. Clearing the unfinished Redux state when the user leaves the screen
8. Displaying a reusable transaction-date selector initialized to today
9. Updating the transaction date in Redux with the native date picker
10. Searching and paging through customers in a reusable selection modal
11. Loading the full customer record before confirming the selection
12. Showing the confirmed customer's contact, address, GST and outstanding
    details
13. Deriving the sale-order tax type from the company and customer states
14. Opening a sale-order-specific despatch details modal
15. Editing challan, container, transport, destination, vehicle, order and
    payment/delivery terms in a temporary form
16. Saving confirmed despatch details to the active Redux draft
17. Searching and paging through products after a customer is selected
18. Searching and selecting from a scalable price-level list, then re-pricing
    existing lines after confirmation
19. Loading full product tax and pricing data before adding a new line
20. Resolving the initial rate from price level, customer LSP, global LSP or a
    manual zero fallback
21. Incrementing duplicate products instead of creating duplicate lines
22. Editing quantities, rate, tax-inclusive mode, discount and description
23. Recalculating staged line amounts and total previews locally
24. Filtering paginated products by brand, category and dependent subcategory
25. Incrementing, decrementing and editing added lines without leaving product
    selection
26. Previewing each added line total and the current order item total while
    browsing products
27. Committing the complete staged product basket and selected price level to
    Redux only when Continue is pressed
28. Loading company-scoped additional-charge masters after items exist
29. Selecting charge snapshots and editing add/subtract amounts in a temporary
    mobile sheet
30. Applying the customer tax type to each selected charge and calculating its
    signed impact without rounding stored values
31. Saving selected charges to Redux and combining their net impact with the
    item total
32. Reviewing subtotal, discount, taxable amount, tax, additional charges and
    final amount in a presentational mobile summary
33. Validating the required company, date, series, customer and item context
34. Building the complete backend-compatible sale-order request payload
35. Submitting the order while the backend atomically issues its final voucher
    number
36. Retaining the draft after failure or clearing it after success
37. Opening the newly created order's detailed mobile view
38. Opening existing sale orders from the voucher list or Daybook
39. Reviewing frozen customer, product, tax, charge, total and despatch
    snapshots from the backend sale-order document
40. Opening an existing `open` sale order in a dedicated mobile editor
41. Hydrating the Redux draft from the saved snake-case backend document
42. Keeping the saved voucher series, voucher number and customer locked
43. Editing the date, despatch details, products, item values and additional
    charges with the existing creation components
44. Preserving saved line-item IDs in the update payload
45. Updating through the existing backend endpoint and returning to refreshed
    sale-order details
46. Rejecting edit access for converted and cancelled sale orders
47. Showing Edit, Cancel, Print and Share together in the sale-order action row
48. Confirming cancellation in a reusable voucher cancellation sheet
49. Soft-cancelling through the existing backend status-transition endpoint
50. Replacing the detail cache with the cancelled server document
51. Refreshing sale-order lists and Daybook after cancellation
52. Showing backend cancellation errors without changing the local status

## Web application references

The current native flow was checked against:

* `frontend/src/pages/sales/SaleOrderCreatePage.jsx`
  * Composes the complete sale-order creation screen.
* `frontend/src/components/TransactionHeader.jsx`
  * Fetches the series, chooses the default and displays the number preview.
* `frontend/src/components/VoucherSeriesModal.jsx`
  * Keeps a temporary selection and confirms it with a Select action.
* `frontend/src/components/sales/create/PartySection.jsx`
  * Defines the required customer section and selected-customer details.
* `frontend/src/components/PartySelectSheet.jsx`
  * Loads the full customer document and resolves the tax type on selection.
* `frontend/src/components/partyList.jsx`
  * Provides debounced search, paginated results and list states.
* `frontend/src/hooks/queries/partyQueries.js`
  * Defines customer list and detail query behavior and cache times.
* `frontend/src/api/services/party.service.js`
  * Defines the customer list and customer-detail API calls.
* `frontend/src/utils/salesCalculation.js`
  * Defines the company-state versus customer-state tax rule.
* `frontend/src/components/sales/create/DetailsSection.jsx`
  * Defines the despatch summary and opens the details editor.
* `frontend/src/components/DespatchDetailsSheet.jsx`
  * Defines all eight fields and confirms local form state only on Save.
* `frontend/src/pages/sales/ProductSelectPage.jsx`
  * Defines product lookup, full-detail loading, price-level selection, initial
    rate priority, duplicate quantity behavior and temporary product filters.
* `frontend/src/components/sales/create/ItemsSection.jsx`
  * Defines the item summary, quantity controls and edit entry points.
* `frontend/src/components/sales/ItemEditSheet.jsx`
  * Defines editable item fields and the live calculation preview.
* `frontend/src/components/sales/create/AdditionalChargesSection.jsx`
  * Defines master selection, temporary edits, add/subtract choices and Save.
* `frontend/src/components/sales/create/SummarySection.jsx`
  * Defines the final review rows and confirms that the summary reads
    reducer-calculated totals instead of calculating inside the component.
* `frontend/src/api/services/saleOrder.service.js`
  * Defines item, charge, despatch, price-level and totals payload mapping.
* `frontend/src/hooks/mutations/useCreateSaleOrder.js`
  * Defines submission cache invalidation and success/error behavior.
* `frontend/src/pages/sales/SaleOrderEditPage.jsx`
  * Defines edit loading, one-time draft hydration, locked customer/series,
    open-status protection and the update screen composition.
* `frontend/src/hooks/mutations/useUpdateSaleOrder.js`
  * Defines update cache invalidation, draft cleanup, errors and success
    navigation.
* `frontend/src/store/slices/transactionSlice.js`
  * Defines saved-document-to-edit-draft mapping for party, items, charges,
    despatch details, voucher identity and totals.
* `frontend/src/pages/transactions/TransactionDetailPage.jsx`
  * Defines detail loading, access errors and sale-order routing.
* `frontend/src/components/transactions/details/SaleOrderDetailView.jsx`
  * Defines the saved sale-order sections, open-status action guard and
    cancellation confirmation entry point.
* `frontend/src/components/transactions/details/CancelVoucherDialog.jsx`
  * Defines the reusable confirmation interaction and pending-state protection.
* `frontend/src/hooks/mutations/useCancelSaleOrder.js`
  * Defines cancellation cache updates, list invalidation and success/error
    feedback.
* `frontend/src/hooks/queries/saleOrderQueries.js`
  * Defines the company-scoped sale-order detail query.
* `frontend/src/api/services/saleOrder.service.js`
  * Defines `PUT /sale-orders/{saleOrderId}/cancel`.
* `frontend/src/hooks/queries/additionalChargeQueries.js`
  * Defines the company-scoped additional-charge server query.
* `frontend/src/api/services/additionalCharge.service.js`
  * Defines `GET /api/additional-charges`.
* `backend/controllers/additionalChargeController.js`
  * Confirms company scoping and the returned charge-master fields.
* `backend/services/saleOrder.service.js`
  * Confirms transactional creation and server-issued voucher identity.
* `backend/services/saleOrderDocument.service.js`
  * Confirms payload normalization and server-side total recalculation.
  * Defines mutable update fields and saved line-ID preservation.
* `backend/services/saleOrder.service.js`
  * Enforces scoped access, editable-status validation and the transactional
    `open` to `cancelled` status change.
* `backend/routes/saleOrder/saleOrderRoute.js`
  * Confirms that cancellation is a soft-cancel PUT route rather than deletion.
* `backend/controllers/saleOrderController.js`
  * Confirms company context comes from protected request middleware and that
    the updated sale-order document is returned.
* `backend/tests/sale_order/saleOrder.route.test.js`
  * Confirms open orders can be cancelled while converted and already-cancelled
    orders are rejected.
* `frontend/src/hooks/queries/productQueries.js`
  * Defines paginated products, filter-master lists and price-level server-state
    queries.
* `frontend/src/api/services/product.service.js`
  * Defines product detail, filter-master, price-level, party-LSP and global-LSP
    APIs.
* `frontend/src/utils/salesCalculation.js`
  * Defines item tax, discount, cess and totals calculations.
* `frontend/src/hooks/queries/voucherSeriesQueries.js`
  * Loads voucher series by company and voucher type.
* `frontend/src/store/slices/transactionSlice.js`
  * Holds the web sale-order draft, despatch defaults and update action.
* `backend/Model/SaleOrder.js`
  * Confirms that all eight saved despatch fields are optional strings.
* `backend/services/saleOrderDocument.service.js`
  * Maps the camel-case draft fields to the backend snake-case document.
* `frontend/src/utils/transactionStorage.js`
  * Defines the web sale-order storage cleanup used when leaving the flow.
* `frontend/src/components/Layout/HomeLayout.jsx`
  * Resets the web Redux sale-order state when navigation leaves the sale-order
    context.

## Native navigation flow

```text
Home
└── Create Order
    └── SaleOrderCreateScreen
        ├── VoucherCreateHeader
        │   ├── TransactionDateSelector
        │   ├── VoucherSeriesSelector
        │   └── VoucherSeriesModal
        ├── VoucherPartySelector
        ├── VoucherPartyModal
        ├── DespatchDetailsSection
        ├── SaleOrderDespatchModal
        ├── SaleOrderItemsSection
        │   └── RemoveItemConfirmationSheet
        ├── AdditionalChargesSection
        ├── SaleOrderSummarySection
        ├── ProductSelectionModal
        │   ├── ProductFilterModal
        │   ├── PriceLevelSelectionModal
        │   └── RepriceConfirmationSheet
        └── SaleOrderItemEditModal
```

The native entry route is `/sale-order-create`.

The native edit entry route is `/sale-order-edit?id={saleOrderId}`. The detail
screen groups Edit, Cancel, Print and Share in one action row. Edit and Cancel
are enabled only while the order status is `open`.

## Shared native components

The following components are reusable by future voucher screens:

* `VoucherSeriesSelector`
  * Displays the confirmed series and next-number preview.
* `VoucherSeriesModal`
  * Allows a temporary choice, Cancel and Select.
* `VoucherPartySelector`
  * Displays the confirmed customer and the details needed while creating a
    voucher.
* `VoucherPartyModal`
  * Provides debounced search, pagination, loading, empty and error states, and
    loads the complete customer before confirmation.
* `VoucherCreateHeader`
  * Provides the shared voucher title, description and date/series layout.
* `TransactionDateSelector`
  * Displays the current date and opens the platform date picker.
* `VoucherLoadingState`
  * Displays section-level loading feedback.
* `VoucherErrorState`
  * Displays an error and Retry action.
* `VoucherEmptyState`
  * Displays missing-company or no-data messages.
* `VoucherCancellationSheet`
  * Confirms a soft status change, blocks repeated taps while pending and can be
    reused by future voucher detail screens.

The sale-order screen remains responsible for fetching its data and deciding
which state component to render. This keeps the reusable UI independent from
React Query and from sale-order-specific state management.

## Sale-order-specific native components

* `DespatchDetailsSection`
  * Shows whether details exist and previews up to two useful references.
* `SaleOrderDespatchModal`
  * Edits the eight sale-order despatch fields in local state and commits the
    complete object only when Save is pressed.
* `SaleOrderItemsSection`
  * Displays the first three confirmed lines, quantity controls and the current
    item total. Its Show all products action opens the complete list in a
    mobile sheet while reusing the same product-row UI. Edit and Remove actions
    are available from both locations.
* `RemoveItemConfirmationSheet`
  * Protects the active draft from accidental item removal. Confirmation
    removes the selected Redux draft item and recalculates item totals.
* `AdditionalChargesSection`
  * Loads company charge masters with React Query, keeps sheet edits temporary
    until Save and displays the saved net impact on the create screen. Its
    interactive selection accents use the app's primary `#134074` brand color.
* `SaleOrderSummarySection`
  * Presents the final calculated totals from Redux. It performs no business
    calculations and does not expose submission during Phase 10.
* `ProductSelectionModal`
  * Owns product search, pagination, price-level selection and asynchronous
    rate resolution before a line is added. Added products expose inline
    quantity controls, edit access, line totals and an order-total preview. Its
    staged basket is copied to Redux only through the header Continue action.
* `ProductFilterModal`
  * Keeps brand, category and subcategory edits temporary until Apply. Changing
    category clears the draft subcategory because it may no longer be valid.
* `PriceLevelSelectionModal`
  * Presents default pricing and every configured price level in a searchable,
    vertical list that remains usable when a company has many price levels.
* `RepriceConfirmationSheet`
  * Replaces the platform alert with a mobile sheet-style confirmation before
    an existing staged basket is re-priced.
* `SaleOrderItemEditModal`
  * Keeps temporary edits local, previews calculations and explicitly saves or
    removes the line. Changing actual quantity also updates billed quantity;
    changing billed quantity does not update actual quantity.

## Current state ownership

Redux now owns the confirmed voucher draft:

```ts
type VoucherDraftState = {
  voucherType: VoucherType | null;
  companyId: string;
  editingVoucherId: string | null;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem | null;
  selectedParty: Party | null;
  taxType: "igst" | "cgst_sgst";
  despatchDetails: SaleOrderDespatchDetails;
  selectedPriceLevel: PriceLevel | null;
  items: SaleOrderItem[];
  itemTotals: SaleOrderItemTotals;
  additionalCharges: SaleOrderAdditionalCharge[];
  additionalChargeTotals: SaleOrderAdditionalChargeTotals;
};
```

The draft provides these actions:

* `startVoucherDraft`
  * Starts a clean draft when company or voucher type changes.
  * Keeps the existing draft when reopening the same context.
  * Does not reuse an edit draft as a new creation draft.
* `loadSaleOrderForEdit`
  * Converts the saved backend document into the existing mobile draft shape.
  * Records the edited voucher ID so another order cannot reuse the draft.
* `setVoucherDate`
  * Updates the transaction date when the reusable date selector confirms a
    new value.
* `setVoucherSeries`
  * Stores or clears the confirmed series.
* `setVoucherParty`
  * Stores the confirmed full customer and its derived sale-order tax type in
    one Redux action.
* `setVoucherDespatchDetails`
  * Replaces the confirmed details object after the modal Save action.
* `setVoucherPriceLevel`
  * Stores the selected level, re-prices every line and recalculates totals.
* `setVoucherAdditionalCharges`
  * Stores selected charge snapshots and recalculates charge and combined
    totals.
* `addVoucherItem`
  * Adds a calculated line or increments matching product quantities.
* `updateVoucherItem`
  * Replaces and recalculates a line; removes it when both quantities are zero.
* `removeVoucherItem`
  * Removes a line and recalculates core item totals.
* `resetVoucherDraft`
  * Clears the active draft when the user leaves the screen, company context is
    removed, app state is reset or the user logs out.

`isSeriesModalOpen` remains in `SaleOrderCreateScreen`. The modal's
`pendingSeriesId` also remains local to the modal. Pressing Cancel discards the
temporary selection, while pressing Select dispatches `setVoucherSeries`.

Customer search text, modal visibility and the ID currently loading remain
local UI state. React Query owns the paginated customer results and full-detail
cache. Redux owns only the confirmed customer used by the active sale order.

The despatch modal also owns a temporary copy of the details form. Opening the
modal refreshes that copy from Redux. Cancel, backdrop close and the platform
back action discard temporary edits. Save commits all eight fields together.

## Sale-order details rules

1. All despatch fields are optional, matching the web form and backend schema.
2. A company is required before the details section can be opened.
3. Redux stores camel-case UI fields; the future submission payload will pass
   this object to the existing backend mapper.
4. Changing company or voucher type resets every field to an empty string.
5. The summary detects any of the eight fields, while its compact preview shows
   at most two transport/reference values.
6. No API call is made while editing because these values belong to the local
   unfinished voucher draft.

## Product and item APIs

```text
GET /api/product?page={page}&limit=20&cmp_id={companyId}&search={search}
GET /api/product/{productId}
GET /api/price-levels?cmp_id={companyId}
GET /api/pricing/lsp?partyId={partyId}&productId={productId}
GET /api/pricing/lsp/global?productId={productId}
GET /api/additional-charges?cmp_id={companyId}
```

## Sale-order edit API

```text
GET /api/sale-orders/{saleOrderId}?cmpId={companyId}
PUT /api/sale-orders/{saleOrderId}
```

The GET response remains React Query server state. `loadSaleOrderForEdit`
creates an editable Redux snapshot only after the document is available. The
PUT payload reuses the creation mapper, includes saved item subdocument IDs,
and submits the existing series and customer identities without allowing those
locked values to change in the UI. The backend applies only mutable fields,
recalculates totals, enforces company/user scope and rejects non-editable
statuses.

## Sale-order cancellation API

```text
PUT /api/sale-orders/{saleOrderId}/cancel
body: { cmp_id: companyId }
```

Cancellation is a soft status transition and never deletes the sale-order
document. The authenticated backend middleware resolves and validates company
access, while the service allows only `open` orders to become `cancelled`.
The returned updated document replaces the company-scoped React Query detail
cache. Sale-order list and Daybook caches are then invalidated so every visible
status is refreshed.

React Query owns paginated products, product-detail cache, price levels and
additional-charge masters. Redux stores only selected product and charge
snapshots; it does not copy complete server lists.

While the product selector is open, a local staged basket owns additions,
quantity changes, removals, edits and price-level re-pricing. Continue replaces
the confirmed Redux item list with that staged basket. Closing the selector
discards it, so reopening starts again from the last confirmed Redux items.

## Product-selection and pricing rules

1. Product selection is disabled until a customer has been confirmed.
2. Search is trimmed, debounced by 500 milliseconds and loaded 20 rows at a
   time.
3. A new product loads its full detail before tax and pricing fields are used.
4. Initial rate priority matches the web flow:
   * selected price-level rate, including zero when the mapping is missing;
   * customer-specific last-sale price when greater than zero;
   * global last-sale price when greater than zero;
   * manual zero fallback.
5. Adding an existing staged product increments actual and billed quantity
   instead of adding a duplicate line.
6. Changing price level while lines exist requires confirmation. Every line is
   re-priced; missing mappings become zero. The confirmation uses the native
   dialog-sheet layout instead of the platform alert.
7. Clearing a price level resets rates that came from a price level to zero so
   stale level pricing is not retained.
8. Product and price-level changes remain local until Continue. The close and
   platform-back actions discard unconfirmed changes.

## Item calculations

For every confirmed line:

1. `lineTotal = rate × billedQty`.
2. A tax-inclusive rate is reduced by the applicable GST percentage before
   discount.
3. Percentage or amount discount is clamped between zero and base price.
4. IGST applies for `igst`; CGST and SGST apply for `cgst_sgst`.
5. Percentage cess applies to taxable value.
6. Additional cess is a per-billed-unit amount.
7. Line total is taxable value plus GST and cess amounts.
8. Item amounts and aggregate totals keep their full calculated precision.
   Native does not round stored calculation results.

Actual quantity is the source quantity while editing a line: changing it also
copies the value to billed quantity. Billed quantity may then be changed
independently and does not write back to actual quantity. All monetary
calculations continue to use billed quantity.

The item calculation preview shows the applicable GST and percentage cess rates
in their row titles. Additional cess is shown separately with its per-unit rate
because it is not percentage-based.

Preview-only presentation formats rates, percentages and calculated amounts to
two decimal places. This formatting does not change the underlying item or
Redux values, and editable input fields continue to use full precision.

Redux recalculates every line, selected charge and combined total whenever the
customer tax type, price level, quantity, rate, discount, tax-inclusive mode,
line list or saved charges change.

## Additional-charge rules

1. At least one item is required before the additional-charge sheet opens.
2. Masters are fetched by company and remain in React Query.
3. Selecting a master creates a transaction snapshot with its name, HSN and tax
   rates; amount and add/subtract action remain local until Save charges.
4. IGST is calculated for `igst`; CGST and SGST are calculated for
   `cgst_sgst`.
5. The current web rule stores cess rates but does not add cess amounts to an
   additional-charge row.
6. Subtract rows contribute a negative final impact, including their applicable
   GST.
7. Charge calculations keep full precision; previews show two decimals.
8. `finalAmount = itemTotal + totalAdditionalCharge`.
9. Changing company or voucher type clears selected charge snapshots. Changing
   the customer tax type recalculates saved charges.
10. Save charges removes selected rows whose amount is blank. An explicitly
    entered zero remains valid because it is an entered amount.

## Customer-selection rules

1. The customer query runs only while the modal is open and a company exists.
2. Search text is trimmed and debounced by 500 milliseconds before querying.
3. Results load 20 at a time and request the next page near the list end.
4. Selecting a row fetches the complete customer document before Redux is
   updated.
5. Outstanding balance and classification fall back to the selected list row
   when the detail response omits them.
6. The modal stays open and displays an error if full-detail loading fails.
7. Changing company or voucher type clears the confirmed customer with the
   rest of the incompatible draft.

The native list uses the same unfiltered party lookup as the current web
sale-order selector. A future product decision can restrict it to a particular
party type without changing the shared modal structure.

## Sale-order tax-type rule

The company state and confirmed customer state decide the later item tax mode:

* Matching non-empty states use `cgst_sgst`.
* Different states use `igst`.
* A missing company or customer state safely falls back to `igst`.

Customer selection owns this business decision. Phase 9 recalculates existing
items and saved additional charges when the customer changes the applicable tax
type.

The date selector also keeps temporary presentation state locally. On iOS, a
pending date is committed only when the user presses Select. On Android, the
native picker commits the date when its Set action is confirmed.

## Transaction-date rules

1. A new sale order starts with the device's current local date.
2. Redux owns the confirmed date as a `YYYY-MM-DD` string.
3. Cancelling the native picker does not change Redux.
4. The selector is disabled until a company is selected.
5. Date selection does not refetch voucher series because the current series API
   is scoped by company and voucher type, not date.

## Voucher-series API and React Query

The native query uses:

```text
GET /api/voucher-series/{companyId}?voucherType=saleOrder&restrict=true
```

React Query owns the response, loading state, error state, cache and retry.
The complete series list is not copied into component state.

## Series-selection rules

After the latest API response is available:

1. Keep the existing selected ID if it still exists in the response.
2. Otherwise choose a series marked `currentlySelected` or `isDefault`.
3. Otherwise choose the first returned series.
4. If no series exists, show the empty state.

The displayed number is formatted from prefix, padded `currentNumber` and
suffix. It is a preview only. The mobile application does not increment or
reserve it; the backend will issue the final number during submission.

## Validation and permissions

Implemented validation in Phase 2:

* A selected company is required before the query runs.
* A series must exist before the selector and modal are rendered.
* A previously selected ID must still exist in the latest API response.

Implemented date protection in Phase 5:

* The UI produces a valid calendar date rather than accepting free-form text.
* Date formatting uses local calendar parts to avoid UTC timezone shifting.

Implemented customer protection in Phase 6:

* A company is required before the customer selector is enabled.
* The selected list row is enriched from the customer-detail API before it is
  confirmed.
* A failed detail request does not replace the existing confirmed customer.

Implemented details protection in Phase 7:

* Temporary modal edits do not update Redux until Save is pressed.
* Cancelling or closing the modal restores the last confirmed values next time.
* The field union prevents code from updating unsupported despatch properties.

Implemented item protection in Phase 8:

* A customer is required before products can be selected.
* Product details must load successfully before a new line is confirmed.
* Failed detail or pricing requests keep the existing draft and show an error.
* Price-level changes with existing lines require confirmation.
* Removing or zeroing a staged line recalculates the modal previews immediately
  without mutating Redux before Continue.
* The create screen renders at most three product rows. Show all products opens
  every confirmed row in a sheet. Editing temporarily hides that sheet while
  the separate native item editor is visible, then reopens All products after
  Save, Remove or Cancel with the updated Redux items and totals.
* Removing from the compact preview or full-list sheet requires confirmation
  before the item is removed from the active Redux draft.

Implemented additional-charge protection in Phase 9:

* Charge masters remain in React Query; Redux stores only saved snapshots.
* Cancel and platform-back discard temporary sheet edits.
* Company or voucher changes clear incompatible saved charges.
* Tax-type changes recalculate selected charges and combined totals.

Implemented summary protection in Phase 10:

* The summary receives calculated Redux totals and does not duplicate
  calculation logic.
* Preview values use two decimal places without changing stored precision.
* No Create action is rendered until the submission phase is implemented.

Implemented submission protection in Phase 11:

* Create is disabled until the company, transaction date, voucher series,
  customer and at least one product are available.
* The client sends only the selected voucher-series identity. The preview
  voucher number is never submitted as a final number.
* Repeated taps are blocked while the create request is pending.
* The draft is cleared only after the backend confirms successful creation.
* A failed request keeps the draft available and shows the backend error.

Implemented edit protection in Phase 13:

* The edit action is shown only for an `open` order.
* The edit route independently blocks converted and cancelled orders, even when
  opened directly.
* The saved series and customer are visible but locked, matching the web flow.
* The saved voucher number is displayed as a fixed identity rather than a
  next-number preview.
* The draft is hydrated only for the current company and sale-order ID.
* The existing line subdocument `_id` is retained so the backend can preserve
  line identity during update.
* Update is disabled until the date, saved series, saved customer and at least
  one item are present.
* Repeated taps are blocked while the update request is pending.
* Update failure keeps the hydrated draft available for correction or retry.
* Existing additional-charge snapshots are matched to current masters by exact
  master ID when available, with a normalized charge-name fallback for saved
  rows whose backend-generated subdocument ID differs from the master ID.

Implemented cancellation protection in Phase 14:

* Cancellation is enabled and its confirmation can be opened only for an
  `open` order. Cancel remains visible but disabled for other statuses so the
  action layout stays consistent.
* Confirmation is required before the request is sent.
* Repeated confirmation taps and sheet dismissal are blocked while the request
  is pending.
* The backend remains authoritative and independently rejects converted or
  already-cancelled orders.
* A failed request keeps the current order unchanged and displays the backend
  message for correction or retry.
* A successful request updates the detail status and refreshes sale-order list
  and Daybook caches.

## Redux fields and draft lifetime

Current Redux fields through Phase 14:

```ts
voucherType
companyId
editingVoucherId
transactionDate
selectedSeries
selectedParty
taxType
despatchDetails
selectedPriceLevel
items
itemTotals
additionalCharges
additionalChargeTotals
```

The sale-order draft is not written to AsyncStorage. It remains in Redux while
the screen is mounted, including normal app backgrounding and navigation to
child sale-order screens. Removing the sale-order screen from the navigation
stack clears the draft. If the operating system terminates the app, the
unfinished sale order is intentionally lost because the product does not
currently provide a draft feature.

## Calculations and payload construction

Item discount, GST, cess, additional charges, combined document totals and the
final review UI are implemented. The final create payload is built by the
native sale-order service. The backend remains the source of truth: it
recalculates the totals and transactionally issues the final voucher number.
These calculations remain sale-order-specific even when visual sections reuse
shared voucher components.

## Success and error behaviour

Current query errors are shown inside the relevant sale-order card or sheet and
can be retried. Closing the additional-charge sheet discards temporary edits;
Save charges commits and recalculates the active Redux draft.
Create and update errors are shown in the summary and as a toast while the
active draft is retained for correction or retry. Cancellation errors use the
backend message and leave the current detail unchanged. After successful
creation or update, the related voucher caches are invalidated, the active
draft is cleared and the app opens the saved sale-order detail screen. A
successful cancellation replaces the detail cache and refreshes the sale-order
list and Daybook. Detail and edit loading and access errors provide a retry
action.

## Intentional mobile differences

* The web uses desktop dialogs and sheets; native uses bottom-aligned
  confirmations for easier mobile interaction.
* Both web and native connect the confirmed series to Redux and clear unfinished
  sale-order state after leaving the sale-order context. Native does not provide
  automatic restart recovery.
* The native screen uses explicit loading, error and empty components sized for
  a section rather than the web header message layout.
* The web Redux header stores an ISO timestamp. Native stores `YYYY-MM-DD`,
  matching the existing native voucher service shape and avoiding timezone
  changes for a date-only field.
* The web selection sheet uses a browser sheet. Native uses a bottom-aligned
  `Modal` with a virtualized list for mobile performance.
* Payment and delivery terms use multiline inputs on mobile so longer terms are
  easier to review; the web currently uses single-line inputs.
* The web details card displays a required marker even though its fields and
  backend schema are optional. Native describes the fields as optional to match
  the actual validation rule.
* Native keeps product selection in a bottom modal instead of navigating to a
  separate browser page, so voucher context stays visible on mobile.
* Product filters open in a second mobile bottom modal. Like the web filter
  sheet, Reset and Apply operate on temporary choices and subcategories depend
  on the selected category.
* The web uses a select field for price levels. Native shows the confirmed
  choice in one compact row and opens a searchable bottom modal, avoiding a
  long horizontal chip row when a company has many price levels.
* Like the web create page, native keeps the main item section compact and
  opens the complete confirmed product list in a bottom sheet. Native previews
  three rows instead of the web implementation's two rows.
* Native adds a direct Remove action beside Edit on each preview and full-list
  row, protected by a confirmation sheet. The web removes through its item
  editor instead.
* The web detail provides print, edit and cancel actions. Native now presents
  those actions together with an additional Share action. Edit and cancellation
  work for open orders;
  native PDF generation remains deferred and the Print action reports that
  limitation.
* Native Share opens the platform share sheet with a text summary containing
  the order number, date, customer, status and final amount. It does not share a
  PDF because native PDF generation is not implemented yet.
* The web cancellation copy says the action can be reverted later. The current
  backend has no restore endpoint, so native does not promise restoration and
  instead explains that history remains available.
* Web and native lock customer and voucher series during edit. Native keeps the
  same bottom-modal interaction used by creation for mutable sections.
* Native stacks customer, products, charges, totals and despatch information
  vertically, while the web uses a multi-column desktop layout.
* Native also exposes quantity, edit and calculated-total controls inside the
  product selector so users can adjust the order while continuing to browse.
* Native uses rose accents for product identity and removal. Filters, pricing,
  adding, loading and the primary Continue action use the approved `#004178`
  accent. Product editing keeps its separate sky accent.
