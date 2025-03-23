export type RoadTime = number;
export type RoadGoal = number;
export type RoadRate = number;
export type SparseSegment = [RoadTime | null, RoadGoal | null, RoadRate | null];
export type DenseSegment = [RoadTime, RoadGoal, RoadRate];
export type Roadall = SparseSegment[];
export type Fullroad = DenseSegment[];
export type Datapoint = {
  daystamp: string;
  timestamp: number;
  value: number;
};
export type UnixDatapoint = [number, number];

// https://help.beeminder.com/article/97-custom-goals#aggday
export type Aggday =
  | "last"
  | "first"
  | "min"
  | "max"
  | "truemean"
  | "mean"
  | "uniqmean"
  | "median"
  | "mode"
  | "trimmean"
  | "sum"
  | "binary"
  | "nonzero"
  | "triangle"
  | "square"
  | "clocky"
  | "count"
  | "skatesum"
  | "cap1";

export type GoalType =
  | "hustler" // Do More
  | "biker" // Odometer
  | "fatloser" // Weight loss
  | "gainer" // Gain Weight
  | "inboxer" // Inbox Fewer
  | "drinker" // Do Less
  | "custom"; // Full access to the underlying goal parameters

export type Goal = {
  rate: number;
  slug: string;
  title: string;
  aggday: Aggday;
  kyoom: boolean;
  yaw: 1 | -1;
  runits: "h" | "d" | "w" | "m" | "y";
  /*
   * Like road but with an additional initial row consisting of
   * [initday, initval, null] and an additional final row consisting
   * of [goaldate, goalval, rate].
   */
  roadall: Roadall;
  /*
   * Like roadall but with the nulls filled in.
   */
  fullroad: Fullroad;
  fineprint: string | null;
  // eslint-disable-next-line camelcase
  weekends_off: boolean;
  mathishard: DenseSegment;
  // eslint-disable-next-line camelcase
  goal_type: GoalType;
  odom: boolean;
};

export type GoalVerbose = {
  datapoints: Datapoint[];
} & Goal;

export type User = {
  // eslint-disable-next-line camelcase
  beeminder_token: string;
  // eslint-disable-next-line camelcase
  beeminder_user: string;
};
