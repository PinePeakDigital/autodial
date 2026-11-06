const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function call(path: string, body: unknown): Promise<void> {
  // Time out, so a hung request can't leave the UI waiting forever (the
  // Disable button waits for the on-load /update).
  const res = await fetch(`${API_URL}/${path}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  }).catch((e: unknown) => {
    if ((e as {name?: unknown} | null)?.name === "TimeoutError") {
      throw new Error("The autodialer didn't respond. Please try again.");
    }
    throw e;
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export function update(user: string, token: string): Promise<void> {
  return call("update", {user, token});
}

export function remove(user: string, token: string): Promise<void> {
  return call("remove", {user, token});
}
