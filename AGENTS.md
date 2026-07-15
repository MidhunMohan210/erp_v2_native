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

1. Search the relevant web application files in `/Users/midhun/Developer/erp_v2.
2. Understand the existing business logic, API calls, validations, permissions and data flow.
3. Reuse the same backend APIs and business rules where appropriate.
4. Adapt the user interface for React Native and mobile usability.
5. Do not directly copy web-only React, HTML, CSS, DOM or browser-specific code.
6. Do not modify the web application unless explicitly requested.
7. If the mobile requirement differs from the web application, follow the mobile requirement and mention the difference.

When reporting completed work, mention which web files were used as references.
