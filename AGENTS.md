# Codex Development Instructions

## Developer experience level

The developer understands React and React Native fundamentals but is currently learning TypeScript.

## TypeScript rules

* Use simple, beginner-friendly TypeScript.
* Prefer explicit and readable types.
* Use simple `type` aliases or `interface` definitions.
* Avoid advanced generics unless they are absolutely necessary.
* Avoid conditional types, mapped types and complicated utility types.
* Avoid unnecessary abstractions and reusable generic systems.
* Allow TypeScript to infer obvious primitive types.
* Do not use `any` merely to hide a type error.
* Add a short comment when a type may be difficult for a beginner to understand.

## React Native rules

* Write straightforward and readable React Native code.
* Prefer simple components and functions over clever abstractions.
* Keep API response types, form types and navigation types easy to understand.
* Before introducing a complicated pattern, check whether a simpler implementation is possible.
* Maintain the existing project structure and conventions.

## Explanation requirement

After making changes:

1. Briefly explain what was changed.
2. Explain any new TypeScript syntax used.
3. Point out the files that contain important changes.
4. Mention any part of the implementation that may be difficult for a TypeScript beginner.

# Web Application Reference

The existing ERP web application is located at:

`/Users/midhun/Developer/erp_v2`

The React Native application is a mobile version of that web application.

Before implementing a screen or feature:

1. Search the relevant web application files in `/Users/midhun/Developer/erp_v2`.
2. Understand the existing business logic, API calls, validations, permissions and data flow.
3. Reuse the same backend APIs and business rules where appropriate.
4. Adapt the user interface for React Native and mobile usability.
5. Do not directly copy web-only React, HTML, CSS, DOM or browser-specific code.
6. Do not modify the web application unless explicitly requested.
7. If the mobile requirement differs from the web application, follow the mobile requirement and mention the difference.

When reporting completed work, mention which web files were used as references.

## Voucher creation rules

These rules are compulsory for sale orders, purchases, receipts, credit notes,
debit notes and every future voucher-creation flow.

### Work in reviewable phases

* Implement only the phase approved by the developer.
* Stop after each phase so the developer can review and understand the code.
* Do not start the next phase until the developer approves it.
* Keep each phase small enough to explain and verify independently.

### Analyse the web voucher flow first

Before implementing or changing a voucher phase:

1. Find the corresponding web screen, components, Redux state, queries, API
   service, validation and calculation utilities.
2. Write down the relevant web files in the phase report or voucher flow
   document.
3. Preserve backend APIs and business rules unless the mobile requirement is
   intentionally different.
4. Mention every intentional difference from the web implementation.

### Build reusable voucher components

* Extract UI and behaviour that is genuinely shared by multiple voucher types.
* Expected shared areas include the voucher header, date selection, voucher
  series selection, party selection, item presentation, loading states, error
  states and empty states where their behaviour is the same.
* Keep voucher-specific validation, calculations and payload construction in
  voucher-specific files.
* Do not create one large generic component or a complicated configuration
  system merely to make code reusable.
* Prefer small components with explicit, beginner-friendly prop types.

### State and storage responsibilities

* Redux Toolkit holds the active voucher draft used by the UI.
* React Query holds backend/server data such as voucher-series lists, parties
  and products. Do not copy complete server lists into Redux or AsyncStorage.
* AsyncStorage may hold a minimal recoverable snapshot of an unfinished draft
  after the persistence phase is implemented.
* SecureStore is reserved for sensitive or small device data such as the login
  token. Do not use SecureStore for full voucher drafts.
* The backend database is the source of truth for completed vouchers.
* Persist identifiers for server records when possible, then validate them
  against fresh API data during restoration.
* Do not persist loading flags, API errors, complete product lists, complete
  party lists or other React Query cache data in the voucher draft.

### Voucher numbering safety

* A voucher number shown before submission is a preview only.
* Never increment, reserve or treat a voucher number as final on the client.
* The backend must issue the final voucher number when the voucher is created.
* When restoring a selected series, verify that it still exists in the latest
  API response before using it.

### Required documentation and comments

* Maintain a Markdown flow document for every voucher type while it is being
  implemented.
* Each flow document must describe the screen flow, web references, shared
  components, Redux state, persisted fields, API calls, validation,
  calculations, payload construction, success behaviour and error behaviour.
* Add short comments above non-obvious business rules, calculations,
  restoration logic and payload transformations.
* Explain why a rule exists when that context prevents future mistakes.
* Do not add comments that merely repeat an obvious line of code.
* Explain new TypeScript types during the phase handoff, especially union types,
  nullable fields and callback prop types that may be unfamiliar to a beginner.

### Voucher phase completion checklist

Before reporting a voucher phase as complete:

1. Run targeted lint and TypeScript checks for the changed files.
2. Verify loading, empty, error and success states relevant to the phase.
3. Confirm that switching company or voucher type cannot reuse incompatible
   draft data.
4. Update the voucher flow document with the behaviour implemented in that
   phase.
5. Report the native files changed and the web files used as references.


# styling

Use tailwind css for styling
