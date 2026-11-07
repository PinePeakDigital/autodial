import {expect} from "@jest/globals";
import Matchers = jest.Matchers;
import {
  fillroadall,
  UNIT_SECONDS,
  parseDate,
  fuzzyEquals,
  Datapoint,
  Goal,
  GoalVerbose, DenseSegment,
} from "../../../src/lib";

interface MyMatchers<R> extends Matchers<R> {
  toFuzzyEqual(expected: number): R;
}

expect.extend({
  toFuzzyEqual(received: number, expected: number) {
    const pass = fuzzyEquals(expected, received);
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to fuzzy equal ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to fuzzy equal ${expected}`,
        pass: false,
      };
    }
  },
});

// Also consumed by root's own vitest suite (dial.spec.ts): it imports this
// module directly rather than duplicating the matcher.
export const e = expect as never as <T>(actual: T) => MyMatchers<T>;

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
