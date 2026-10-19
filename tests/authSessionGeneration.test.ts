import assert from "node:assert/strict";
import test from "node:test";

import {
  attachAuthGeneration,
  endAuthSession,
  finishUnauthorizedLogout,
  isCurrentAuthGeneration,
  shouldStartUnauthorizedLogout,
  startAuthSession,
  type AuthGenerationRequestMetadata,
} from "../src/services/authSessionGeneration";

function createAuthenticatedRequest(): AuthGenerationRequestMetadata {
  const request: AuthGenerationRequestMetadata = {};
  attachAuthGeneration(request);
  return request;
}

test("an old User A request is stale after User B starts a session", () => {
  startAuthSession();
  const userARequest = createAuthenticatedRequest();
  endAuthSession();
  startAuthSession();

  assert.equal(isCurrentAuthGeneration(userARequest.__authGeneration), false);
  assert.equal(
    shouldStartUnauthorizedLogout(401, false, userARequest.__authGeneration),
    false,
  );
});

test("an old request is stale after the same user logs out and back in", () => {
  startAuthSession();
  const oldRequest = createAuthenticatedRequest();
  endAuthSession();
  startAuthSession();

  assert.equal(
    shouldStartUnauthorizedLogout(401, false, oldRequest.__authGeneration),
    false,
  );
});

test("a current authenticated request can start normal automatic logout", () => {
  startAuthSession();
  const currentRequest = createAuthenticatedRequest();

  assert.equal(
    shouldStartUnauthorizedLogout(401, false, currentRequest.__authGeneration),
    true,
  );
  finishUnauthorizedLogout(currentRequest.__authGeneration);
});

test("simultaneous active-session 401 responses claim logout once", () => {
  startAuthSession();
  const firstRequest = createAuthenticatedRequest();
  const secondRequest = createAuthenticatedRequest();

  assert.equal(
    shouldStartUnauthorizedLogout(401, false, firstRequest.__authGeneration),
    true,
  );
  assert.equal(
    shouldStartUnauthorizedLogout(401, false, secondRequest.__authGeneration),
    false,
  );
  finishUnauthorizedLogout(firstRequest.__authGeneration);
});

test("a login endpoint 401 cannot start automatic logout", () => {
  startAuthSession();
  const currentRequest = createAuthenticatedRequest();

  assert.equal(
    shouldStartUnauthorizedLogout(401, true, currentRequest.__authGeneration),
    false,
  );
});
