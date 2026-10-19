import type {JSX} from "react";
import Tags from "./tags";
import { LinearProgress } from "@mui/material";
import GoalsTable from "./goalsTable";
import React from "react";
import useGoals from "../../lib/useGoals";
import useParams from "../../lib/useParams";
import { useIsFetching } from "@tanstack/react-query";

export default function StepTwo(): JSX.Element {
  const params = useParams();
  const goals = useGoals();
  const isFetching = useIsFetching();

  return (
    <>
      <h3>Step 2: Configure specific goals to use the autodialer</h3>
      <p>
        Add one or more of the following tags to the fineprint / description of
        the goals you wish to autodial:
      </p>

      <Tags />

      {params.user && goals.data?.length && (
        <>
          <p>Here are your goals for which autodialing is enabled:</p>

          {isFetching ? <LinearProgress /> : null}
          <GoalsTable goals={goals.data} username={params.user} />
        </>
      )}
    </>
  );
}
