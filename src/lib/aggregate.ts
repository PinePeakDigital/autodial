import {parseDate} from "./time";
import {Aggday, Datapoint} from "./types";

const sum = (vals: number[]) => vals.reduce((a, b) => a + b, 0);

type Reducer = (values: number[]) => number | undefined

function aggregateByDate(data: Datapoint[], reduce: Reducer): Datapoint[] {
  // A plain object, like lodash's groupBy: its integer-like daystamp keys
  // iterate in ascending order.
  const sets: Record<string, Datapoint[]> = {};
  for (const d of data) (sets[d.daystamp] ??= []).push(d);
  return Object.entries(sets).map(([k, s]) =>
    ({
      daystamp: k,
      timestamp: parseDate(k),
      value: reduce(s.map((d) => d.value)) || 0,
    }),
  );
}

const uniqueMean = (vals: number[]) => {
  const unique = Array.from(new Set(vals));
  return sum(unique) / unique.length;
};

// https://stackoverflow.com/a/53660837/937377
function median(numbers: number[]) {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

const methodMap: Partial<{[k in Aggday]: Reducer}> = {
  "last": (vals) => vals.pop(),
  "first": (vals) => vals.shift(),
  "sum": (vals) => sum(vals),
  "min": (vals) => Math.min(...vals),
  "max": (vals) => Math.max(...vals),
  "count": (vals) => vals.length,
  "binary": (vals) => +!!vals.length,
  "nonzero": (vals) => +!!vals.filter((v) => v).length,
  "truemean": (vals) => sum(vals) / vals.length,
  "mean": uniqueMean,
  "uniqmean": uniqueMean,
  "median": median,
  "cap1": (vals) => Math.min(sum(vals), 1),
  "square": (vals) => Math.pow(sum(vals), 2),
  "triangle": (vals) => (sum(vals) * (sum(vals) + 1)) / 2,
};

export default function aggregate(
    data: Datapoint[],
    method: Aggday,
): Datapoint[] {
  const reducer = methodMap[method];

  if (!reducer) {
    throw new Error("Unsupported aggday method!");
  }

  return aggregateByDate(data, reducer);
}
