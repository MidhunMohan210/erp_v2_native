# Voucher Creation Architecture

## Purpose

This document defines how voucher-creation flows should be built in the React
Native application. It covers sale orders, purchases, receipts, credit notes,
debit notes and future voucher types.

The implementation is intentionally divided into small phases. Each phase must
be reviewed before the next phase begins.

## Current implementation status

At the end of Phase 6:

* The architecture and development rules are documented.
* Voucher-series selection, its modal and its section-level loading, error and
  empty states are reusable native components.
* The sale-order screen composes those shared components.
* A shared Redux voucher draft holds the active voucher type, company, date and
  confirmed voucher series.
* The sale-order screen reads and updates its confirmed series through Redux.
* Modal visibility and the modal's unconfirmed choice remain component state.
* Unfinished vouchers are not persisted to device storage.
* Removing the sale-order screen from the navigation stack clears its active
  Redux draft, matching the web flow's current discard behaviour while allowing
  child sale-order screens to preserve the same draft.
* Normal app backgrounding keeps Redux state while the process remains alive;
  operating-system termination intentionally loses the unfinished voucher.
* `VoucherCreateHeader` composes the shared voucher identity, transaction date
  and voucher-specific content.
* `TransactionDateSelector` provides a native date picker and writes confirmed
  `YYYY-MM-DD` values to Redux through an explicit callback prop.
* `VoucherPartySelector` and `VoucherPartyModal` provide reusable confirmed
  customer display, debounced search, pagination and full-detail loading.
* The sale-order draft stores the confirmed customer and its explicit
  `"igst" | "cgst_sgst"` tax type.
* Selecting a customer follows the web rule: matching company/customer states
  use CGST/SGST; other or missing states use IGST.

The sections below describe the target architecture for later approved phases.
They do not indicate that those phases have already been implemented.

## Design principles

1. Reuse components when the UI and behaviour are genuinely common.
2. Keep voucher-specific business rules in voucher-specific files.
3. Prefer small, explicit TypeScript types over advanced generic systems.
4. Treat the backend as the source of truth for server records and final
   voucher numbers.
5. Do not add unfinished-draft persistence without a separately approved product
   requirement and clear restore/discard behaviour.
6. Document business rules and non-obvious data transformations.

## Planned component boundaries

Common voucher-creation components can include:

```text
src/components/voucher-create/
├── VoucherCreateHeader.tsx
├── TransactionDateSelector.tsx
├── VoucherSeriesSelector.tsx
├── VoucherSeriesModal.tsx
├── VoucherPartySelector.tsx
├── VoucherPartyModal.tsx
├── VoucherLoadingState.tsx
├── VoucherErrorState.tsx
├── VoucherEmptyState.tsx
└── VoucherSectionCard.tsx
```

Voucher screens should compose the common components and their own sections:

```text
SaleOrderCreateScreen
├── VoucherCreateHeader
├── SaleOrderPartySection
├── SaleOrderDetailsSection
├── SaleOrderItemsSection
├── SaleOrderAdditionalChargesSection
└── SaleOrderSummarySection
```

Purchase, credit-note and debit-note screens may reuse the header and other
matching components, but they should retain their own business validation,
calculation and payload-building code where the rules differ.

The project should not use one large component controlled by a complex generic
configuration object. That pattern would hide the business flow and make the
TypeScript harder to understand.

## Responsibility of each data layer

### Component state

Component state is for temporary presentation details that do not need to be
shared or restored, such as:

* Whether a selection modal is open
* A temporary selection before the user presses Confirm
* Local animation state

Component state should not be the permanent home of the active voucher draft.

### Redux Toolkit

Redux will hold the active voucher draft so every section can read and update
the same working data.

The first planned draft state is deliberately small:

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

Later phases can add details, items, additional charges and totals when those
sections are implemented. Fields should not be added before they are needed.

### React Query

React Query owns data fetched from the backend, including:

* Voucher-series lists
* Parties and ledgers
* Products
* Price levels
* Existing voucher details

Complete API lists should not be duplicated in Redux or device storage. React
Query manages loading, error, caching and refetching for this server data.

### Unfinished draft persistence

Device persistence is not part of the current voucher-creation behaviour.
Redux holds the active draft while the voucher screen remains mounted, including
navigation to child screens in the same creation flow. If a future product
requirement introduces draft recovery, it must be implemented as a new
reviewable phase with an explicit user experience for restoring or discarding
old work. It must not silently restore stale financial transaction data.

### SecureStore

SecureStore is for sensitive or small device values, such as the authentication
token. It should not hold full voucher drafts because draft data can grow and is
not authentication data.

### Backend database

The backend is the source of truth for:

* Completed vouchers
* Current voucher-series data
* The final issued voucher number
* Server-side validation and authorization

The mobile application may preview a voucher number, but only the backend can
issue the final number during voucher creation.

## Planned draft lifecycle

### Starting a voucher

1. Open the voucher-creation screen with a voucher type and selected company.
2. Create or activate the matching Redux draft.
3. Fetch current server data through React Query.
4. Validate the selected identifier against the fresh server response.
5. Render the confirmed draft through the screen components.

### Selecting a voucher series

Use this priority order:

1. The current Redux selection if it still exists in the latest API response
2. The API series marked `currentlySelected`
3. A series marked `isDefault`
4. The first available series

The confirmed selection is stored in Redux for the active screen session.

### Saving draft changes

The UI updates Redux immediately. The current product does not save unfinished
changes to device storage.

### Successful submission

1. Read the latest active draft from Redux.
2. Validate required fields on the client.
3. Build the voucher-specific API payload.
4. Submit the payload to the backend.
5. Accept the final voucher number returned by the backend.
6. Clear the successful draft from Redux.
7. Invalidate relevant React Query data.
8. Navigate to the created voucher's detail screen.

### Failed submission

Keep the Redux draft so the user can correct the problem and try again while
remaining on the screen. Display the backend error without deleting entered
data.

### Leaving, company changes and voucher-type changes

Removing a voucher-creation screen from the navigation stack clears its Redux
draft. Navigating to a child screen keeps the parent mounted and preserves the
draft. Changing company or voucher type starts a clean matching Redux draft so
data from one context cannot be reused in another.

## Voucher numbering rules

The number displayed on the creation screen is a preview built from the latest
voucher-series response:

```text
prefix / padded current number / suffix
```

The client must not increment or reserve this number. Another user or device may
create a voucher before the current user submits. The backend must atomically
issue and return the final voucher number.

## Documentation required for each voucher type

Each voucher type must have its own flow document containing:

1. Screen and navigation flow
2. Relevant web application references
3. Shared and voucher-specific native components
4. Redux draft fields and actions
5. Draft lifetime and discard behaviour
6. React Query hooks and API calls
7. Required permissions and validation
8. Item, tax, discount and total calculations
9. Final request payload construction
10. Success, failure and draft-cleanup behaviour
11. Intentional differences from the web application

Comments in the source code should explain business decisions, calculations,
restoration logic and payload transformations. Comments should not repeat code
whose meaning is already obvious.

## Approved implementation phases

1. Architecture rules and documentation
2. Reusable voucher-series components
3. Redux voucher-draft state
4. Session-only draft lifecycle and leave-screen cleanup
5. Reusable voucher header and transaction date
6. Sale-order customer selection
7. Sale-order details
8. Product and item selection
9. Additional charges and totals
10. Validation and sale-order submission
11. Reuse for purchase, credit-note and debit-note flows

Only one approved phase should be implemented at a time.

## Phase review checklist

At the end of every phase:

* Explain what changed and what remains intentionally unimplemented.
* Explain new TypeScript syntax introduced in the phase.
* List important native files and web reference files.
* Run targeted lint and TypeScript checks for changed source files.
* Update the relevant voucher flow documentation.
* Stop and wait for developer approval before starting the next phase.
