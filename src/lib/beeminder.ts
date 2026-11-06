import {GoalVerbose, Goal, Roadall} from "./index";
import {BeeminderAuthError} from "./beeminderAuthError";

// Beeminder returns either the resource or an { errors } object.
// response.json() is unknown under workers-types, so cast at the boundary.
type WithErrors = { errors?: { message: string } };

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

// Goal calls use `me`, so the access token alone decides whose goals are
// read or written; no stored username goes into a Beeminder URL.
export async function getGoals(token: string): Promise<Goal[]> {
  // Keep the token out of `url` so it never lands in the thrown/logged message.
  const url = "https://www.beeminder.com/api/v1/users/me/goals.json?filter=frontburner";
  const response = await fetch(`${url}&access_token=${token}`);

  if (!response.ok) {
    const msg =
      `Fetch error: ${response.status} - ${response.statusText} - ${url}`;
    if (response.status === 401 || response.status === 404) {
      throw new BeeminderAuthError(response.status, msg);
    }
    throw new Error(msg);
  }

  const data = await response.json() as Goal[] & WithErrors;

  if (data?.errors) {
    throw new Error(data.errors.message);
  }

  return data;
}

export async function getGoal(
    token: string,
    slug: string,
    diffSince: number,
): Promise<GoalVerbose> {
  // Keep the token out of `url` so it never lands in the thrown/logged message.
  const url = `https://www.beeminder.com/api/v1/users/me/goals/${slug}.json?diff_since=${diffSince}&datapoints=true`;
  const response = await fetch(`${url}&access_token=${token}`);

  if (!response.ok) {
    const msg =
      `Fetch error: ${response.status} - ${response.statusText} - ${url}`;
    if (response.status === 401 || response.status === 404) {
      throw new BeeminderAuthError(response.status, msg);
    }
    throw new Error(msg);
  }

  const data = await response.json() as GoalVerbose & WithErrors;

  if (data?.errors) {
    throw new Error(data.errors.message);
  }

  return data;
}

// The Worker identifies the caller by the access token alone: Beeminder says
// whose token it is, so a client-supplied username is never trusted or
// interpolated into a URL.
export async function getMe(token: string): Promise<string> {
  const url = "https://www.beeminder.com/api/v1/users/me.json";
  const response = await fetch(
      `${url}?access_token=${encodeURIComponent(token)}`,
  );

  if (!response.ok) {
    const msg =
      `Fetch error: ${response.status} - ${response.statusText} - ${url}`;
    throw new Error(msg);
  }

  const data = await response.json() as WithErrors & {username?: unknown};

  if (data?.errors) {
    throw new Error(data.errors.message);
  }

  if (typeof data?.username !== "string" || !data.username) {
    throw new Error("Beeminder returned no username for this access token");
  }

  return data.username;
}

export async function updateGoal(
    token: string,
    slug: string,
    fields: {roadall: Roadall},
): Promise<Omit<Goal, "datapoints">> {
  const url = `https://www.beeminder.com/api/v1/users/me/goals/${slug}.json`;
  const putData = {
    ...fields,
    roadall: JSON.stringify(fields.roadall),
  };
  const response = await fetch(`${url}?access_token=${token}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(putData),
  });

  if (!response.ok) {
    const msg =
      `Fetch error: ${response.status} - ${response.statusText} - ${url}`;
    throw new Error(msg);
  }

  const data = await response.json() as Omit<Goal, "datapoints"> & WithErrors;

  if (data?.errors) {
    throw new Error(data.errors.message);
  }

  return data;
}
