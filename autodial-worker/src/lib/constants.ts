// this is what physicists use, eg, to define a light year
export const DIY = 365.25;

// seconds in a day (not used: DIM=DIY/12, WIM=DIY/12/7)
export const SID = 86400;

export const UNIT_SECONDS = {
  "y": DIY * SID,
  "m": DIY * SID / 12,
  "w": 7 * SID,
  "d": SID,
  "h": 3600,
};

// Akrasia horizon calculated as 8 days to avoid accounting for timezone
export const AKRASIA_HORIZON = UNIT_SECONDS["d"] * 8;
