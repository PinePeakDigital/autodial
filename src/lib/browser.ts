// The Beeminder OAuth redirect lands with the access token in the query
// string. Move it into sessionStorage and clean the URL straight away, so the
// token stays out of browser history, the Worker's request logs and Sentry.
const KEY = "autodial_credentials";

type Credentials = {user: string | null, token: string | null};

export function takeCredentialsFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("access_token");
  if (!token) return;
  sessionStorage.setItem(
      KEY, JSON.stringify({user: params.get("username"), token}),
  );
  window.history.replaceState(null, "", window.location.pathname);
}

export function getCredentials(): Credentials {
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return {user: c?.user ?? null, token: c?.token ?? null};
  } catch {
    return {user: null, token: null};
  }
}

export const clearCredentials = (): void => sessionStorage.removeItem(KEY);
