import {GoalVerbose, Goal, Roadall} from "./index";
import {BeeminderError, BeeminderErrorKind} from "./beeminderError";

// Beeminder returns either the resource or an { errors } object.
// response.json() is unknown under workers-types, so cast at the boundary.
type WithErrors = { errors?: { message: string } };

const API = "https://www.beeminder.com/api/v1/users/me";

type Scope = "account" | "goal";

const kindOf = (status: number, scope: Scope): BeeminderErrorKind =>
  status === 401 || (status === 404 && scope === "account") ?
    "credential-rejected" :
    status === 404 ? "not-found" : "other";

// Every Beeminder call goes through here. Calls use `me`, so the access token
// alone decides whose data is read or written; no stored username goes into
// a Beeminder URL.
async function request<T>(
    token: string,
    path: string,
    scope: Scope,
    init?: RequestInit,
): Promise<T> {
  // Keep the token out of `url` so it never lands in the thrown/logged message.
  const url = `${API}${path}`;
  const sep = url.includes("?") ? "&" : "?";
  const response = await fetch(
      `${url}${sep}access_token=${encodeURIComponent(token)}`,
      init,
  );

  if (!response.ok) {
    throw new BeeminderError(
        kindOf(response.status, scope),
        response.status,
        `Fetch error: ${response.status} - ${response.statusText} - ${url}`,
    );
  }

  const data = await response.json() as T & WithErrors;

  if (data?.errors) {
    throw new BeeminderError("other", response.status, data.errors.message);
  }

  return data;
}

export async function getGoalsVerbose(
    token: string,
    diffSince: number,
): Promise<GoalVerbose[]> {
  const goals = await getGoals(token);
  const results = await Promise.allSettled(goals.map((g) => {
    return getGoal(token, g.slug, diffSince);
  }));
  return results.flatMap((r) => {
    if (r.status === "fulfilled") {
      return [r.value];
    } else {
      console.log(r);
      return [];
    }
  });
}

export const getGoals = (token: string): Promise<Goal[]> =>
  request(token, "/goals.json?filter=frontburner", "account");

export const getGoal = (
    token: string,
    slug: string,
    diffSince: number,
): Promise<GoalVerbose> => request(
    token,
    `/goals/${slug}.json?diff_since=${diffSince}&datapoints=true`,
    "goal",
);

// The Worker identifies the caller by the access token alone: Beeminder says
// whose token it is, so a client-supplied username is never trusted or
// interpolated into a URL.
export async function getMe(token: string): Promise<string> {
  const data = await request<{username?: unknown}>(token, ".json", "account");

  if (typeof data?.username !== "string" || !data.username) {
    throw new Error("Beeminder returned no username for this access token");
  }

  return data.username;
}

export const updateGoal = (
    token: string,
    slug: string,
    fields: {roadall: Roadall},
): Promise<Omit<Goal, "datapoints">> => request(
    token,
    `/goals/${slug}.json`,
    "goal",
    {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        ...fields,
        roadall: JSON.stringify(fields.roadall),
      }),
    },
);
