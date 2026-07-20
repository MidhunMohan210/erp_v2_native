# Sale Order Creation Flow

## Implementation status

Phase 7 is complete. The native flow currently supports:

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

Items, calculations and final submission are intentionally not part of Phase 7.

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
        └── SaleOrderDespatchModal
```

The native entry route is `/sale-order-create`.

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

The sale-order screen remains responsible for fetching its data and deciding
which state component to render. This keeps the reusable UI independent from
React Query and from sale-order-specific state management.

## Sale-order-specific native components

* `DespatchDetailsSection`
  * Shows whether details exist and previews up to two useful references.
* `SaleOrderDespatchModal`
  * Edits the eight sale-order despatch fields in local state and commits the
    complete object only when Save is pressed.

## Current state ownership

Redux now owns the confirmed voucher draft:

```ts
type VoucherDraftState = {
  voucherType: VoucherType | null;
  companyId: string;
  transactionDate: string;
  selectedSeries: VoucherSeriesItem | null;
  selectedParty: Party | null;
  taxType: "igst" | "cgst_sgst";
  despatchDetails: SaleOrderDespatchDetails;
};
```

The draft provides these actions:

* `startVoucherDraft`
  * Starts a clean draft when company or voucher type changes.
  * Keeps the existing draft when reopening the same context.
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

This is stored now because customer selection owns the business decision. Item
tax recalculation will be added only in the approved item phase.

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

Additional sale-order validation and permission rules will be documented when
their corresponding phases are implemented.

## Redux fields and draft lifetime

Implemented Phase 3 Redux fields:

```ts
voucherType
companyId
transactionDate
selectedSeries
selectedParty
taxType
despatchDetails
```

The sale-order draft is not written to AsyncStorage. It remains in Redux while
the screen is mounted, including normal app backgrounding and navigation to
child sale-order screens. Removing the sale-order screen from the navigation
stack clears the draft. If the operating system terminates the app, the
unfinished sale order is intentionally lost because the product does not
currently provide a draft feature.

## Calculations and payload construction

Item calculations, totals and the final sale-order API payload are not
implemented in the current phased flow. They will remain sale-order-specific
even when their visual sections reuse shared voucher components.

## Success and error behaviour

Current query errors are shown inside the sale-order card and can be retried.
The Redux draft is retained only while the sale-order screen remains mounted.
There is no create submission or success cleanup yet.

Future successful submission will clear the matching Redux draft only after the
backend confirms creation. A failed submission will retain the active Redux
state while the user stays on the screen.

## Intentional mobile differences

* The web uses a desktop dialog; native uses a bottom-aligned React Native
  `Modal` for easier mobile interaction.
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
