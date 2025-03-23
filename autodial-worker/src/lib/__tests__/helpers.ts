import { expect } from 'vitest';
import { Goal, GoalVerbose, Datapoint, DenseSegment } from '../types';
import { fillroadall, UNIT_SECONDS, parseDate, fuzzyEquals } from '../index';

export function fuzzyEqual(received: number, expected: number) {
  const pass = fuzzyEquals(expected, received);
  if (!pass) {
    throw new Error(`expected ${received} to fuzzy equal ${expected}`);
  }
}

type DatapointInput = Omit<Datapoint, "timestamp"> & { timestamp?: number };
export type GoalInput = Partial<Goal> & { datapoints?: DatapointInput[] };

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

export function setNow(yyyy: number, m: number, d: number): number {
  const value: number = Date.UTC(yyyy, m - 1, d, 12) / 1000;
  vi.spyOn(Date, 'now').mockReturnValue(value * 1000);
  return value;
}