import { now } from "./time";
import { AKRASIA_HORIZON, SID, UNIT_SECONDS } from "./constants";
import { getRollingAverageRate } from "./getRollingAverageRate";
import { fuzzyEquals } from "./fuzzyEquals";
import { AutodialSettings, GoalVerbose, Roadall, SparseSegment } from "./index";

function clip(x: number, min: number, max: number) {
  if (min > max) [min, max] = [max, min];
  return x < min ? min : x > max ? max : x;
}

// Goal maturity is defined in terms of the length of the goal's road,
// as a percentage of one month, capped at 100%.
function getGoalMaturity(
  g: GoalVerbose,
  opts: Partial<AutodialSettings>
): number {
  const t = now();
  const { fromGoal } = opts;
  const start = Math.max(
    g.fullroad[0][0],
    fromGoal ? fromGoal.fullroad[0][0] : 0
  );
  const len = t - start;

  return Math.min(len / (SID * 30), 1);
}

function calculateNewRate(g: GoalVerbose, opts: Partial<AutodialSettings>) {
  const {
    min = -Infinity,
    max = Infinity,
    strict = false,
    add = 0,
    times = 1,
    fromGoal,
  } = opts;

  const neverLess = strict && g.yaw == 1;
  const neverMore = strict && g.yaw == -1;
  const strictMin = neverLess && g.rate !== null ? Math.max(min, g.rate) : min;
  const strictMax = neverMore && g.rate !== null ? Math.min(max, g.rate) : max;
  const rateSeconds = UNIT_SECONDS[g.runits];
  const averagePerSecond = getRollingAverageRate(fromGoal ?? g);
  const oldRate = g.mathishard[2];
  const newRate = averagePerSecond * rateSeconds * times + add;
  const maturity = getGoalMaturity(g, opts);
  const rateDiff = oldRate - newRate;
  const modulatedRate = oldRate - rateDiff * maturity;

  return clip(modulatedRate, strictMin, strictMax);
}

function shouldDial(g: GoalVerbose) {
  if (g.odom) throw new Error("Odometer-type goals are not supported");

  const roadallEnd = g.roadall[g.roadall.length - 1];

  if (roadallEnd[2] === null)
    throw new Error("Goals without explicit end rates are not supported");

  const fullroadEnd = g.fullroad[g.fullroad.length - 1];

  // If the goal ends within the akrasia horizon, don't dial it.
  if (fullroadEnd[0] <= now() + AKRASIA_HORIZON)
    throw new Error("Goal ends too soon to dial");
}

function buildRoad(g: GoalVerbose, newRate: number): Roadall {
  const t = now();
  const tail = g.roadall.slice(0, -1);
  const lastRow = g.roadall[g.roadall.length - 1];
  const lastRowModified: SparseSegment = [lastRow[0], lastRow[1], newRate];
  const fullTail = g.fullroad.slice(0, -1);
  const unixTimes = fullTail.map((r) => r[0]);
  const shouldAddBoundary = !unixTimes.some((ut) => {
    return ut >= t + AKRASIA_HORIZON;
  });

  if (!shouldAddBoundary) {
    return [...tail, lastRowModified];
  }

  return [...tail, [t + AKRASIA_HORIZON, null, lastRow[2]], lastRowModified];
}

export function dial(
  g: GoalVerbose,
  opts: Partial<AutodialSettings> = {}
): Roadall | false {
  shouldDial(g);

  const newRate = calculateNewRate(g, opts);
  const oldRate = g.mathishard[2];

  if (fuzzyEquals(newRate, oldRate)) return false;

  return buildRoad(g, newRate);
}
