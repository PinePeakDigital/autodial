import { dial } from "./dial";
import { describe, it } from "@jest/globals";
import { e, makeGoal } from "../../functions/src/test/helpers";
import { parseDate } from "./time";
import { setNow } from "./test/helpers";
import { Roadall } from "./types";
import { SkipDialError } from "./skipDialError";

function getRoadEnd(roadall: Roadall | false) {
  if (!roadall) {
    throw new Error("Rate not adjusted");
  }

  return roadall[roadall.length - 1];
}

const expectEndRate = (roadall: Roadall | false, expected: number) => {
  const end = getRoadEnd(roadall);

  e(end[2]).toEqual(expected);
};

const expectFuzzyEndRate = (roadall: Roadall | false, expected: number) => {
  if (!roadall) {
    throw new Error("Rate not adjusted");
  }

  const end = roadall[roadall.length - 1];

  e(end[2]).toFuzzyEqual(expected);
};

describe("dial function", () => {
  it("dials goal with no datapoints", () => {
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

  it("dials goal with less than 30d history", () => {
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

  it("dials goal with datapoint after a month", () => {
    setNow(2021, 2, 24);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210124"), 0, null],
          [parseDate("20210324"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210124", value: 0 },
          {
            daystamp: "20210125",
            value: 1,
          },
        ],
      })
    );

    expectFuzzyEndRate(r, 1 / 30);
  });

  it("dials goal with datapoint after a week with runits=weekly", () => {
    setNow(2021, 2, 25);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "w",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210325"), null, 2],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210126", value: 30 / 7 },
        ],
      })
    );

    expectFuzzyEndRate(r, 1);
  });

  it("dials goal with min option", () => {
    setNow(2021, 2, 25);

    const r = dial(
      makeGoal({
        slug: "my_special_slug",
        aggday: "last",
        kyoom: false,
        runits: "w",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210325"), null, 1],
        ],
        datapoints: [{ daystamp: "20210126", value: 1 }],
      }),
      { min: 2 }
    );

    expectEndRate(r, 2);
  });

  it("supports aggday last", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 1 },
          { daystamp: "20210201", value: 2 },
        ],
      })
    );

    expectFuzzyEndRate(r, 2 / 30);
  });

  it("supports aggday first", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "first",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 1 },
          { daystamp: "20210201", value: 2 },
        ],
      })
    );

    expectFuzzyEndRate(r, 1 / 30);
  });

  it("supports aggday sum", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "sum",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 1 },
          { daystamp: "20210201", value: 2 },
        ],
      })
    );

    expectFuzzyEndRate(r, 3 / 30);
  });

  it("supports aggday min", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "min",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 1 },
          { daystamp: "20210201", value: 2 },
        ],
      })
    );

    expectFuzzyEndRate(r, 1 / 30);
  });

  it("supports aggday max", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "max",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 2 },
          { daystamp: "20210201", value: 1 },
        ],
      })
    );

    expectFuzzyEndRate(r, 2 / 30);
  });

  it("supports aggday count", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "count",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 5 },
          { daystamp: "20210201", value: 5 },
        ],
      })
    );

    // because data is not cumulative, initial day aggregates to 1,
    // and additional day aggregates to 2, so difference is 1
    expectFuzzyEndRate(r, 1 / 30);
  });

  it("supports cumulative goals", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "count",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 5 },
          { daystamp: "20210201", value: 5 },
        ],
      })
    );

    expectFuzzyEndRate(r, 2 / 30);
  });

  it("supports aggday binary", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "binary",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 5 },
          { daystamp: "20210201", value: 5 },
        ],
      })
    );

    expectFuzzyEndRate(r, 1 / 30);
  });

  it("supports aggday nonzero", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "nonzero",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 0 },
          { daystamp: "20210202", value: 5 },
        ],
      })
    );

    expectFuzzyEndRate(r, 1 / 30);
  });

  it("supports aggday truemean", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "truemean",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 5 },
          { daystamp: "20210201", value: 5 },
        ],
      })
    );

    expectFuzzyEndRate(r, 5 / 30);
  });

  it("supports aggday mean", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "mean",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 5 },
          { daystamp: "20210201", value: 5 },
        ],
      })
    );

    expectFuzzyEndRate(r, 5 / 30);
  });

  it("supports aggday uniquemean", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "uniqmean",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 5 },
          { daystamp: "20210201", value: 5 },
        ],
      })
    );

    expectFuzzyEndRate(r, 5 / 30);
  });

  it("supports aggday median", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "median",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 1 },
          { daystamp: "20210201", value: 4 },
          { daystamp: "20210201", value: 5 },
        ],
      })
    );

    expectFuzzyEndRate(r, 4 / 30);
  });

  it("supports aggday cap1", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "cap1",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 1 },
          { daystamp: "20210201", value: 1 },
        ],
      })
    );

    expectFuzzyEndRate(r, 1 / 30);
  });

  it("supports aggday square", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "square",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 1 },
          { daystamp: "20210201", value: 2 },
        ],
      })
    );

    expectFuzzyEndRate(r, 9 / 30);
  });

  it("supports aggday triangle", () => {
    setNow(2021, 2, 29);

    const r = dial(
      makeGoal({
        aggday: "triangle",
        kyoom: true,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210401"), null, 1],
        ],
        datapoints: [
          { daystamp: "20210125", value: 0 },
          { daystamp: "20210201", value: 1 },
          { daystamp: "20210201", value: 1 },
        ],
      })
    );

    expectFuzzyEndRate(r, 3 / 30);
  });

  it("protects akrasia horizon", async () => {
    setNow(2021, 3, 1);

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

    e(r && r[1]).toEqual([parseDate("20210309"), null, 1]);
  });

  it("does not add row if last segment starts after horizon", async () => {
    setNow(2021, 2, 25);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210305"), null, 1],
          [parseDate("20210325"), null, 1],
        ],
        datapoints: [],
      })
    );

    e(r && r.length).toEqual(3);
  });

  it("uses fullroad to decide if akrasia boundary needed", async () => {
    setNow(2021, 2, 25);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [null, 40, 1],
          [parseDate("20210325"), null, 1],
        ],
        datapoints: [],
      })
    );

    e(r && r.length).toEqual(3);
  });

  it("does not dial goal if new rate ~= old rate", async () => {
    setNow(2021, 2, 25);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210325"), null, 0.000000000000000000001],
        ],
        datapoints: [],
      })
    );

    expect(r).toBeFalsy();
  });

  it("takes weekends off into account", async () => {
    setNow(2021, 2, 25);

    const r = dial(
      makeGoal({
        rate: 5,
        weekends_off: true,
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210325"), null, 5],
        ],
        datapoints: [
          {
            daystamp: "20210125",
            value: 0,
          },
          {
            daystamp: "20210220",
            value: (30 * 5) / 7,
          },
        ],
      })
    );

    expectFuzzyEndRate(r, 1);
  });

  it("adjusts rate slowly for new do-less goal", async () => {
    setNow(2021, 2, 1);

    const r = dial(
      makeGoal({
        rate: 5,
        weekends_off: true,
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210325"), null, 5],
        ],
        datapoints: [],
      })
    );

    expectFuzzyEndRate(r, 5 - (7 / 30) * 5);
  });

  it("does not use future datapoints when calculating rate", async () => {
    setNow(2021, 2, 25);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [parseDate("20210325"), null, 0.000000000000000000001],
        ],
        datapoints: [
          {
            daystamp: "20210226",
            value: 100000,
          },
        ],
      })
    );

    expect(r).toBeFalsy();
  });

  it("does not dial goal without end rate", async () => {
    setNow(2021, 2, 25);

    const fn = () =>
      dial(
        makeGoal({
          aggday: "last",
          kyoom: false,
          runits: "d",
          roadall: [
            [parseDate("20210125"), 0, null],
            [parseDate("20220125"), 10, null],
          ],
          datapoints: [],
        })
      );

    expect(fn).toThrow(SkipDialError);
    expect(fn).toThrow("Goals without explicit end rates are not supported");
  });

  it("does not make strict goal easier", () => {
    setNow(2021, 2, 24);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        rate: 5,
        runits: "d",
        roadall: [
          [parseDate("20210124"), 0, null],
          [parseDate("20210324"), null, 5],
        ],
        datapoints: [
          { daystamp: "20210124", value: 0 },
          {
            daystamp: "20210125",
            value: 1,
          },
        ],
      }),
      { strict: true }
    );

    expect(r).toBeFalsy();
  });

  it("does not make strict do-less goal easier", () => {
    setNow(2021, 2, 24);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        yaw: -1,
        rate: 0,
        runits: "d",
        roadall: [
          [parseDate("20210124"), 0, null],
          [parseDate("20210324"), null, 0],
        ],
        datapoints: [
          { daystamp: "20210124", value: 0 },
          {
            daystamp: "20210125",
            value: 1,
          },
        ],
      }),
      { strict: true }
    );

    expect(r).toBeFalsy();
  });

  it("preserves end value", () => {
    setNow(2021, 2, 25);

    const r = dial(
      makeGoal({
        aggday: "last",
        kyoom: false,
        runits: "d",
        roadall: [
          [parseDate("20210125"), 0, null],
          [null, 300, 1],
        ],
        datapoints: [],
      })
    );

    const end = getRoadEnd(r);

    expect(end).toEqual([null, 300, 0]);
  });

  it("does not dial odometer goals", async () => {
    setNow(2021, 2, 25);

    const fn = () =>
      dial(
        makeGoal({
          odom: true,
          roadall: [
            [parseDate("20210125"), 0, null],
            [null, 300, 1],
          ],
        })
      );

    expect(fn).toThrow(SkipDialError);
    expect(fn).toThrow("Odometer-type goals are not supported");
  });

  it("does not dial goal ending within the akrasia horizon", async () => {
    setNow(2021, 2, 25);

    const fn = () =>
      dial(
        makeGoal({
          aggday: "last",
          kyoom: false,
          runits: "d",
          roadall: [
            [parseDate("20210125"), 0, null],
            [parseDate("20210226"), null, 1],
          ],
          datapoints: [],
        })
      );

    expect(fn).toThrow(SkipDialError);
    expect(fn).toThrow("Goal ends too soon to dial");
  });

  it("uses average of `from` goal", async () => {
    setNow(2021, 2, 24);

    const g1 = makeGoal({
      slug: "to",
      roadall: [
        [parseDate("20210124"), 0, null],
        [parseDate("20210325"), null, 1],
      ],
      datapoints: [{ daystamp: "20210124", value: 0 }],
    });
    const g2 = makeGoal({
      slug: "from",
      roadall: [
        [parseDate("20210124"), 0, null],
        [parseDate("20210325"), null, 1],
      ],
      datapoints: [
        { daystamp: "20210124", value: 0 },
        {
          daystamp: "20210224",
          value: 1,
        },
      ],
    });

    const r = dial(g1, { fromGoal: g2 });

    expectFuzzyEndRate(r, 1 / 30);
  });

  it("uses `times` option", async () => {
    setNow(2021, 2, 24);

    const g = makeGoal({
      aggday: "last",
      kyoom: false,
      runits: "d",
      roadall: [
        [parseDate("20210124"), 0, null],
        [parseDate("20210324"), null, 1],
      ],
      datapoints: [
        { daystamp: "20210124", value: 0 },
        {
          daystamp: "20210125",
          value: 1,
        },
      ],
    });

    const r = dial(g, { times: 2 });

    expectFuzzyEndRate(r, 2 / 30);
  });

  it("uses min of two goals ages when using from option", async () => {
    setNow(2021, 2, 24);

    const g1 = makeGoal({
      slug: "to",
      roadall: [
        [parseDate("20210124"), 0, null],
        [parseDate("20210325"), null, 0],
      ],
      datapoints: [{ daystamp: "20210124", value: 0 }],
    });
    const g2 = makeGoal({
      slug: "from",
      roadall: [
        [parseDate("20210223"), 0, null],
        [parseDate("20210325"), null, 0],
      ],
      datapoints: [
        { daystamp: "20210223", value: 0 },
        {
          daystamp: "20210224",
          value: 1,
        },
      ],
    });

    const r = dial(g1, { fromGoal: g2 });

    expectFuzzyEndRate(r, 0.001111111111);
  });

  it("does not add row with date after end row", () => {
    setNow(2021, 2, 24);

    const g = makeGoal({
      aggday: "last",
      kyoom: false,
      runits: "d",
      roadall: [
        [parseDate("20210124"), 0, null],
        [parseDate("20210224"), null, 1],
      ],
      datapoints: [
        { daystamp: "20210124", value: 0 },
        {
          daystamp: "20210125",
          value: 1,
        },
      ],
    });

    const fn = () => dial(g, { times: 2 });

    expect(fn).toThrow(SkipDialError);
  });

  it("still throws a plain Error for genuine failures", async () => {
    setNow(2021, 2, 25);

    const fn = () =>
      dial(
        // roadall is empty, so reading its last element blows up with a
        // real bug, not one of the expected skip conditions.
        makeGoal({
          aggday: "last",
          kyoom: false,
          runits: "d",
          roadall: [],
          datapoints: [],
        })
      );

    expect(fn).toThrow();
    try {
      fn();
      throw new Error("expected fn to throw");
    } catch (err) {
      expect(err).not.toBeInstanceOf(SkipDialError);
    }
  });
});

// TODO:
// support odom goals
