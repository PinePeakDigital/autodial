import { describe, it, expect, beforeEach } from 'vitest';
import { dial } from '../dial';
import { makeGoal, setNow, fuzzyEqual } from './helpers';
import { parseDate } from '../time';
import { Roadall } from '../types';

function getRoadEnd(roadall: Roadall | false) {
  if (!roadall) {
    throw new Error("Rate not adjusted");
  }
  return roadall[roadall.length - 1];
}

function expectEndRate(roadall: Roadall | false, expected: number) {
  const end = getRoadEnd(roadall);
  expect(end[2]).toBe(expected);
}

function expectFuzzyEndRate(roadall: Roadall | false, expected: number) {
  if (!roadall) {
    throw new Error("Rate not adjusted");
  }
  const end = roadall[roadall.length - 1];
  fuzzyEqual(end[2] as number, expected);
}

describe('dial function', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('dials goal with no datapoints', () => {
    setNow(2021, 2, 25);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210325"), null, 1],
        ],
        datapoints: [],
      })
    );

    expectEndRate(r, 0);
  });

  it('dials goal with less than 30d history', () => {
    setNow(2021, 2, 1);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210301"), null, 1],
        ],
        datapoints: [{ daystamp: "20210125", value: 1 }],
      })
    );

    expectFuzzyEndRate(r, 1 - 7 / 30);
  });

  // ... More tests can be migrated as needed ...
});