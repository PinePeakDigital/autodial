import type {JSX} from "react";
import { Box, TableCell, TableRow } from "@mui/material";
import {
  AutodialSettings,
  dial,
  getGoalAge,
  getRollingAverageRate,
  getSettings,
  GoalVerbose,
  UNIT_SECONDS,
} from "../../lib";
import React, { useEffect, useState } from "react";
import moment from "moment";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import { green } from "@mui/material/colors";

function fn(n: number): string {
  return n.toFixed(2).replace(/\.0+$/, "");
}

function getEdge(g: GoalVerbose, o: AutodialSettings): number {
  const r = g.mathishard[2];

  let e = 0;
  if (r === o.min) e = -1;
  if (r === o.max) e = 1;

  return e * g.yaw;
}

interface Props {
  goal: GoalVerbose;
  username: string;
}

export default function GoalRow({ goal, username }: Props): JSX.Element {
  const [settings, setSettings] = useState<AutodialSettings>();
  const [pendingRate, setPendingRate] = useState<false | number>(false);
  const [arpn, setArpn] = useState<number>();
  const [edge, setEdge] = useState<number>(0);
  const [error, setError] = useState<string>();

  const success = edge === 1;
  const backgroundColor = success ? green[50] : "initial";

  useEffect(() => {
    const options = getSettings(goal);

    try {
      const newRoad = dial(goal, options);
      const newRate = newRoad && newRoad[newRoad.length - 1][2];
      const arps = getRollingAverageRate(goal);
      const arpn = arps * UNIT_SECONDS[goal.runits];

      setEdge(getEdge(goal, options));
      setSettings(options);
      setPendingRate(newRate === null ? false : newRate);
      setArpn(arpn);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
    }
  }, [goal]);

  const min =
    settings?.min === -Infinity ? "—" : `${settings?.min}/${goal.runits}`;
  const max =
    settings?.max === Infinity ? "—" : `${settings?.max}/${goal.runits}`;

  const rate = goal.mathishard[2];

  return (
    <TableRow sx={{ backgroundColor }}>
      <TableCell>
        <a
          href={`https://beeminder.com/${username}/${goal.slug}`}
          target={"_blank"}
          rel={"nofollow noreferrer"}
        >
          {goal.slug}
        </a>
      </TableCell>
      <TableCell>{min}</TableCell>
      <TableCell>{max}</TableCell>
      <TableCell>{settings?.add === 0 ? "—" : settings?.add}</TableCell>
      <TableCell>{settings?.times === 1 ? "—" : settings?.times}</TableCell>
      <TableCell>
        {settings?.from ? (
          <a
            href={`https://beeminder.com/${username}/${settings.from}`}
            target={"_blank"}
            rel={"nofollow noreferrer"}
          >
            {settings.from}
          </a>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>{settings?.strict ? "yes" : "no"}</TableCell>
      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {fn(rate)}/{goal.runits}
          {pendingRate && (
            <>
              <DoubleArrowIcon
                aria-label={"pending change"}
                fontSize={"inherit"}
                sx={{ pl: 1, pr: 1 }}
              />
              <span>
                {fn(pendingRate)}/{goal.runits}
              </span>
            </>
          )}
        </Box>
      </TableCell>
      <TableCell>
        {arpn !== undefined &&
          `${fn(arpn)}${settings?.add == 0 ? "" : "+" + settings?.add}/${
            goal.runits
          }`}
      </TableCell>
      <TableCell>{goal.weekends_off ? "yes" : "no"}</TableCell>
      <TableCell>
        {moment.duration(getGoalAge(goal) * 1000).humanize()}
      </TableCell>
      <TableCell>{error}</TableCell>
    </TableRow>
  );
}
