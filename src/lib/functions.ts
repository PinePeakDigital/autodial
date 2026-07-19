const API_URL = process.env.REACT_APP_API_URL || "";

async function call(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API_URL}/${path}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
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
