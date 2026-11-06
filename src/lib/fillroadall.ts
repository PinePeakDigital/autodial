import {daysnap} from "./time";
import {Fullroad, Roadall} from "./types";

// TODO: Improve types throughout; get rid of `as [type]` as much as possible

/* ~2038, specifically Rails's ENDOFDAYS+1 (was 2^31-2weeks)
 @type {Number} */
const BDUSK = 2147317201;

// Helper for fillroad for propagating forward filling in all the nulls
const nextrow = (
    or: [number, number, number],
    nr: [number|null, number|null, number|null],
): [number, number, number] => {
  const tprev = or[0];
  const vprev = or[1];
  const t = nr[0];
  const v = nr[1];
  const r = nr[2];
  const x = tvr(tprev, vprev, t, v, r); // the missing t, v, or r
  if (t === null && v !== null && r !== null) return [x, v, r];
  if (v === null && t !== null && r !== null) return [t, x, r];
  if (r === null && t !== null && v !== null) return [t, v, x];
  if (t === null || v === null) {
    throw new Error("Too many null values");
  }
  return [t, v, x];
};

/* Given the endpt of the last road segment (tp,vp) and 2 out of 3 of
 t = goal date for a road segment (unixtime)
 v = goal value
 r = rate in hertz (s^-1), ie, road rate per second
 return the third, namely, whichever one is passed in as null. */
const tvr = (
    tp: number,
    vp: number,
    t: number|null,
    v: number|null,
    r: number|null,
) => {
  if (t === null && v !== null && r !== null) {
    if (r === 0) return BDUSK;
    else return daysnap(Math.min(BDUSK, tp + (v-vp)/r));
  }
  if (v === null && t !== null && r !== null) return vp+r*(t-tp);
  if (r === null && t !== null && v !== null) {
    if (t === tp) return 0; // special case: zero-length road segment
    return (v-vp)/(t-tp);
  }
  return 0;
};

// Version of fillroad that assumes tini/vini is the first row of road
export const fillroadall = (roadall: Roadall, siru: number): Fullroad => {
  if (!roadall.length) return [];
  // clone array to avoid modifying reference
  const rd = roadall.map((row) => [...row]) as Roadall;
  const tini = rd[0][0];
  const vini = rd[0][1];

  if (tini === null || vini === null) {
    throw new Error("Initial time or value was null");
  }
  rd.splice(0, 1);
  rd.forEach((e) => (e[2] = null === e[2] ? e[2] : e[2]/siru));
  rd[0] = nextrow([tini, vini, 0], rd[0]);
  for (let i = 1; i < rd.length; i++) {
    rd[i] = nextrow(rd[i-1] as [number, number, number], rd[i]);
  }
  rd.forEach((e) => (e[2] = (null === e[2]) ? e[2] : e[2]*siru));
  const firstRow = [tini, vini, 0];
  return [
    firstRow,
    ...rd,
  ] as Fullroad;
};
