/**
 * Tracks the in-memory identity of the active authentication session.
 *
 * The value is intentionally not persisted. A request keeps the generation
 * that was active when it started, allowing a later response to prove that it
 * still belongs to the current session without storing a token in metadata.
 */
/*
 * The number for the session that is currently allowed to use the app.
 *
 * It increases whenever a session starts or ends. For example, a request
 * started by User A may keep generation 4. After User B logs in, the current
 * generation becomes 6, so User A's delayed response is no longer current.
 */
let currentAuthGeneration = 0;

// Covers both authentication and selected-company changes for UI side effects.
let currentContextGeneration = 0;

/*
 * The generation currently being logged out because of a 401 response.
 *
 * `null` means no automatic logout is running. Storing the generation lets
 * concurrent 401 responses from the same session see that one logout already
 * owns the work instead of clearing the app state more than once.
 */
let unauthorizedLogoutGeneration: number | null = null;

export type AuthGenerationRequestMetadata = {
  /** Internal Axios metadata. This is never sent as an HTTP header. */
  __authGeneration?: number;
};

export function startAuthSession(): number {
  // Creates a new current session generation for login or session restoration.
  currentAuthGeneration += 1;
  currentContextGeneration += 1;
  return currentAuthGeneration;
}

export function endAuthSession(): number {
  // Makes every request from the session that just ended immediately stale.
  currentAuthGeneration += 1;
  currentContextGeneration += 1;
  return currentAuthGeneration;
}

/** Returns the current generation so other session-scoped work can guard itself. */
export function getCurrentAuthGeneration(): number {
  return currentAuthGeneration;
}

/** Advances the UI context after a confirmed company selection changes. */
export function advanceContextGeneration(): number {
  currentContextGeneration += 1;
  return currentContextGeneration;
}

export function getCurrentContextGeneration(): number {
  return currentContextGeneration;
}

export function isCurrentContextGeneration(generation: number): boolean {
  return generation === currentContextGeneration;
}

export function attachAuthGeneration(
  request: AuthGenerationRequestMetadata,
): void {
  // Save the current generation on this request only; Axios does not send it.
  request.__authGeneration = currentAuthGeneration;
}

export function isCurrentAuthGeneration(
  generation: number | undefined,
): boolean {
  /*
   * An old request cannot trigger logout because its saved generation differs
   * from the current one. Example: request generation 4 must not log out the
   * active generation 6 session after another user has logged in.
   */
  return generation !== undefined && generation === currentAuthGeneration;
}

/**
 * Claims the automatic-logout work for one session. Concurrent 401 responses
 * from that same session return false while the first logout is still running.
 */
export function beginUnauthorizedLogout(
  //   true → Yes, start the logout process.
  // false → No, don't start logout.
  generation: number | undefined,
): boolean {
  // Ignore a 401 from an old request before it can affect the new session.
  if (!isCurrentAuthGeneration(generation)) return false;

  // Only the first 401 for this session starts logout; later ones wait quietly.
  if (unauthorizedLogoutGeneration === generation) return false;

  // isCurrentAuthGeneration above narrows the runtime contract to a number.
  unauthorizedLogoutGeneration = generation ?? null;
  return true;
}

export function shouldStartUnauthorizedLogout(
  status: number | undefined,
  isLoginRequest: boolean,
  generation: number | undefined,
): boolean {
  // A login 401 is an invalid-password result, not an expired active session.
  return (
    status === 401 && !isLoginRequest && beginUnauthorizedLogout(generation)
  );
}

export function finishUnauthorizedLogout(generation: number | undefined): void {
  /*
   * Clear the in-progress marker after the claimed logout finishes. The check
   * prevents an older cleanup call from clearing a marker owned by another
   * generation.
   */
  if (unauthorizedLogoutGeneration === generation) {
    unauthorizedLogoutGeneration = null;
  }
}
