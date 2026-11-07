// Plain goal builders shared by the frontend (vitest) and Worker (jest)
// suites. No React and no test-runner globals: each suite does its own
// spying and matcher registration.
import {
  fillroadall,
  UNIT_SECONDS,
  parseDate,
  Datapoint,
  Goal,
  GoalVerbose, DenseSegment,
} from "../index";

// Noon UTC on the given date, in Unix seconds. Specs pin `now()` to it.
export const noonUtc = (yyyy: number, m: number, d: number): number =>
  Date.UTC(yyyy, m - 1, d, 12) / 1000;

type DatapointInput = Omit<Datapoint, "timestamp"> & { timestamp?: number };
export type GoalInput = Partial<Goal>
  & { datapoints?: DatapointInput[] }

function getRate(g: GoalInput, mathishard: DenseSegment | undefined): number {
  if (g.rate !== undefined) {
    return g.rate;
  }

  if (mathishard !== undefined) {
    return mathishard[2];
  }

  return 1;
}

export function makeGoal(g: GoalInput = {}): GoalVerbose {
  const roadall = g.roadall || [];
  const runits = g.runits || "d";
  const fullroad = fillroadall(roadall, UNIT_SECONDS[runits]);
  const mathishard = fullroad[fullroad.length - 1];

  return {
    ...g,
    slug: g.slug || "the_slug",
    rate: getRate(g, mathishard),
    aggday: g.aggday || "last",
    kyoom: g.kyoom || false,
    yaw: g.yaw || 1,
    runits,
    roadall,
    fullroad,
    datapoints: (g.datapoints || []).map((d: DatapointInput) => ({
      timestamp: parseDate(d.daystamp),
      ...d,
    })),
    fineprint: g.fineprint || "",
    title: g.title || "",
    weekends_off: g.weekends_off || false,
    mathishard,
    goal_type: g.goal_type || "hustler",
    odom: g.odom || false,
  };
}
