import {GoalVerbose, Goal, Roadall} from "./index";

// Beeminder returns either the resource or an { errors } object.
// response.json() is unknown under workers-types, so cast at the boundary.
type WithErrors = { errors?: { message: string } };

export async function getGoalsVerbose(
    user: string,
    token: string,
    diffSince: number,
): Promise<GoalVerbose[]> {
  const goals = await getGoals(user, token);
  const results = await Promise.allSettled(goals.map((g) => {
    return getGoal(user, token, g.slug, diffSince);
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

export async function getGoals(
    user: string,
    token: string,
): Promise<Goal[]> {
  // Keep the token out of `url` so it never lands in the thrown/logged message.
  const url = `https://www.beeminder.com/api/v1/users/${user}/goals.json?filter=frontburner`;
  const response = await fetch(`${url}&access_token=${token}`);

  if (!response.ok) {
    throw new Error(
        `Fetch error: ${response.status} - ${response.statusText} - ${url}`
    );
  }

  const data = await response.json() as Goal[] & WithErrors;

  if (data?.errors) {
    throw new Error(data.errors.message);
  }

  return data;
}

export async function getGoal(
    user: string,
    token: string,
    slug: string,
    diffSince: number,
): Promise<GoalVerbose> {
  // Keep the token out of `url` so it never lands in the thrown/logged message.
  const url = `https://www.beeminder.com/api/v1/users/${user}/goals/${slug}.json?diff_since=${diffSince}&datapoints=true`;
  const response = await fetch(`${url}&access_token=${token}`);

  if (!response.ok) {
    throw new Error(
        `Fetch error: ${response.status} - ${response.statusText} - ${url}`
    );
  }

  const data = await response.json() as GoalVerbose & WithErrors;

  if (data?.errors) {
    throw new Error(data.errors.message);
  }

  return data;
}

export async function getUser(user: string, token: string): Promise<unknown> {
  const url = `https://www.beeminder.com/api/v1/users/${user}.json`;
  const response = await fetch(`${url}?access_token=${token}`);

  if (!response.ok) {
    const msg =
      `Fetch error: ${response.status} - ${response.statusText} - ${url}`;
    throw new Error(msg);
  }

  const data = await response.json() as WithErrors;

  if (data?.errors) {
    throw new Error(data.errors.message);
  }

  return data;
}

export async function updateGoal(
    user: string,
    token: string,
    slug: string,
    fields: {roadall: Roadall},
): Promise<Omit<Goal, "datapoints">> {
  const url = `https://www.beeminder.com/api/v1/users/${user}/goals/${slug}.json`;
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
