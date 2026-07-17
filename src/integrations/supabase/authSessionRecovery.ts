const AUTH_USER_PATH = '/auth/v1/user';

type ResponseLike = Pick<Response, 'status'>;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * `auth.getUser()` validates a persisted token over the network. A rejected
 * token must be removed once, otherwise independent UI consumers keep issuing
 * the same failing request on every mount or refresh.
 */
export function isRejectedAuthUserRequest(
  input: RequestInfo | URL,
  response: ResponseLike,
): boolean {
  if (response.status !== 401 && response.status !== 403) return false;

  try {
    return new URL(requestUrl(input)).pathname.endsWith(AUTH_USER_PATH);
  } catch {
    return requestUrl(input).includes(AUTH_USER_PATH);
  }
}

export function createAuthRecoveryFetch(
  clearLocalSession: () => Promise<unknown>,
  nativeFetch: typeof fetch = fetch,
): typeof fetch {
  let recoveryInFlight = false;

  return async (input, init) => {
    const response = await nativeFetch(input, init);
    if (isRejectedAuthUserRequest(input, response) && !recoveryInFlight) {
      recoveryInFlight = true;
      void clearLocalSession().finally(() => {
        recoveryInFlight = false;
      });
    }
    return response;
  };
}
