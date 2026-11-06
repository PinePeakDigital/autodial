// The Beeminder OAuth redirect lands with the access token in the query
// string. Move it into sessionStorage and clean the URL straight away, so the
// token doesn't linger in the address bar, browser history or Sentry events.
const KEY = "autodial_credentials";

type Credentials = {user: string | null, token: string | null};

// Kept in memory too, so the app still works for this page load when storage
// is blocked (some private-browsing modes throw on access).
let memory: Credentials | null = null;

export function takeCredentialsFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("access_token");
  if (!token) return;
  window.history.replaceState(null, "", window.location.pathname);
  // A bookmarked disable link from before the disable button: drop the token
  // rather than re-enable the user.
  if (params.get("disable") === "true") return;
  memory = {user: params.get("username"), token};
  try {
    sessionStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Storage blocked: the in-memory copy covers this page load.
  }
}

export function getCredentials(): Credentials {
  if (memory) return memory;
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return {user: c?.user ?? null, token: c?.token ?? null};
  } catch {
    return {user: null, token: null};
  }
}

export function clearCredentials(): void {
  memory = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing was stored.
  }
}
