import {describe, expect, it} from "vitest";
import aggregate from "./aggregate";
import {daysnap, parseDate} from "./time";
import {Datapoint} from "./types";

const point = (daystamp: string, value: number): Datapoint =>
  ({daystamp, value, timestamp: parseDate(daystamp)} as Datapoint);

describe("aggregate", () => {
  it("returns one point per day, in ascending day order", () => {
    const data = [
      point("20210203", 1),
      point("20210201", 2),
      point("20210203", 3),
    ];

    expect(aggregate(data, "last").map((d) => [d.daystamp, d.value])).toEqual([
      ["20210201", 2],
      ["20210203", 3],
    ]);
  });
});

describe("daysnap", () => {
  it("floors to 00:00:00 UTC", () => {
    expect(daysnap(Date.UTC(2021, 1, 1, 23, 59, 59) / 1000))
        .toBe(Date.UTC(2021, 1, 1) / 1000);
    expect(daysnap(-1)).toBe(-86400);
  });
});
