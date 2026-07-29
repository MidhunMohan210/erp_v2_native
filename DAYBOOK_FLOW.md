# Daybook Flow

## Implementation status

The first native Daybook phase is complete. It supports:

1. Opening Daybook from the home quick actions
2. Loading the current company's voucher timeline from `GET /api/vouchers`
3. Defaulting to the current month and all available voucher types
4. Filtering by from date, to date, Sale Order and Receipt
5. Applying Today, Yesterday, Last 7 days and This month presets
6. Keeping filter edits temporary until Apply filters is pressed
7. Pull-to-refresh and paginated loading
8. Loading, empty, error and end-of-list states
9. Showing voucher number, party, date, type, status and two-decimal amount
10. Opening sale orders in the native sale-order detail screen

## Web references

The native implementation was checked against:

* `frontend/src/pages/Home/DaybookPage.jsx`
  * Defines the company-scoped infinite query, timeline cards and navigation.
* `frontend/src/components/filters/TransactionFilterSheet.jsx`
  * Defines temporary filter edits, reset/apply behavior and voucher selection.
* `frontend/src/components/filters/daybookFilterOptions.js`
  * Defines the current Sale Order and Receipt filter options.
* `frontend/src/utils/dateRangePresets.js`
  * Defines the web date-range preset behavior.
* `backend/services/voucher.service.js`
  * Confirms date filtering, voucher-type filtering, creator scoping and paging.
* `backend/controllers/voucherController.js`
  * Confirms that company ownership is taken from authenticated middleware.

## State and data ownership

Daybook results remain in React Query. The screen stores only its small active
filter object in local React state. Voucher lists are not copied to Redux or
AsyncStorage. The query key includes company, range and voucher types, so
switching company cannot reuse another company's timeline.

## API

`GET /api/vouchers` receives:

```ts
cmpId
from
to
voucherType
page
limit
```

All selected voucher types are sent as `all`; a partial selection is sent as a
comma-separated value. The backend remains responsible for company and creator
access rules.

## Loading, empty, error and success behavior

The initial request shows a page loader. Errors show a retry action. An empty
range shows an explicit empty state. Pull-to-refresh reloads the range and
scrolling near the end requests the next page only when the backend reports
`hasMore`.

## Intentional mobile differences

* The web filter sheet displays its from/to inputs side by side. Native stacks
  them so the platform date pickers have comfortable touch targets.
* Native uses pull-to-refresh in addition to infinite scrolling.
* Sale Order opens its full native detail. Receipt remains visible in Daybook,
  but its detail action is deferred to the receipt-detail phase.
