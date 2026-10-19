import type {JSX} from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import React from "react";

export default function Tags(): JSX.Element {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size={"small"}>
        <TableHead>
          <TableRow>
            <TableCell>Tag</TableCell>
            <TableCell>Effect</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>#autodial</TableCell>
            <TableCell>Enables autodialing for goal</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>#autodialMin=1</TableCell>
            <TableCell>
              Enables autodialing and specifies the smallest rate the autodialer
              will set for the goal, in terms of your goal's current time unit.
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>#autodialMax=1</TableCell>
            <TableCell>
              Enables autodialing and specifies the largest rate the autodialer
              will set for the goal, in terms of your goal's current time unit.
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>#autodialAdd=1</TableCell>
            <TableCell>
              Enables autodialing and specifies an amount to be added to your
              30-day average (can be negative).
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>#autodialTimes=0.5</TableCell>
            <TableCell>
              Enables autodialing and specifies a multiplier to be applied to
              your 30-day average (can be negative).
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>#autodialFrom=goal_slug</TableCell>
            <TableCell>
              Enables autodialing and tells the autodialer to use the average
              rate from a separate goal.
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>#autodialStrict</TableCell>
            <TableCell>
              Enables autodialing and prevents autodialer from ever making goal
              easier.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
