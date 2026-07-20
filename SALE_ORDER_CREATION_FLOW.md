# Sale Order Creation Flow

## Implementation status

Phase 6 is complete. The native flow currently supports:

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

Sale-order details, items, calculations and final submission are intentionally
not part of Phase 6.

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
* `frontend/src/hooks/queries/voucherSeriesQueries.js`
  * Loads voucher series by company and voucher type.
* `frontend/src/store/slices/transactionSlice.js`
  * Holds the web sale-order draft and informed the native Phase 3 state.
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
        ├── Voucher series query
        ├── VoucherSeriesSelector
        └── VoucherSeriesModal
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
* `resetVoucherDraft`
  * Clears the active draft when the user leaves the screen, company context is
    removed, app state is reset or the user logs out.

`isSeriesModalOpen` remains in `SaleOrderCreateScreen`. The modal's
`pendingSeriesId` also remains local to the modal. Pressing Cancel discards the
temporary selection, while pressing Select dispatches `setVoucherSeries`.

Customer search text, modal visibility and the ID currently loading remain
local UI state. React Query owns the paginated customer results and full-detail
cache. Redux owns only the confirmed customer used by the active sale order.

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
