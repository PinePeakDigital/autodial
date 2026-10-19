import type {JSX} from "react";
import {Alert, Button} from "@mui/material";
import React, {useEffect} from "react";
import useUpdate from "../../lib/useUpdate";
import useRemove from "../../lib/useRemove";
import useGoals from "../../lib/useGoals";
import useParams from "../../lib/useParams";
import useIsAuthenticated from "../../lib/useIsAuthenticated";

export default function StepOne(): JSX.Element {
  const params = useParams();
  const update = useUpdate();
  const remove = useRemove();
  const goals = useGoals();
  const isAuthenticated = useIsAuthenticated();

  const {VITE_APP_URL = "", VITE_BM_CLIENT_ID = ""} = import.meta.env;
  const redirectUri = encodeURIComponent(VITE_APP_URL);
  const enableUrl = `https://www.beeminder.com/apps/authorize?client_id=${VITE_BM_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token`;
  const disableUrl =
    `/?access_token=${params.token}&username=${params.user}&disable=true`;

  const {user, token, disable} = params;

  useEffect(() => {
    if (!user || !token) return;

    if (disable) {
      remove.mutate({user, token});
    } else {
      update.mutate({user, token});
    }
  },
  [user, token]);

  return <>
    <h3>Step 1: Connect the autodialer to your Beeminder account</h3>

    {update.error && <Alert severity="error">{update.error.message}</Alert>}
    {remove.error && <Alert severity="error">{remove.error.message}</Alert>}
    {goals.error && <Alert severity="error">{goals.error.message}</Alert>}

    {remove.isSuccess &&
        <Alert severity="success">The autodialer has been disabled for Beeminder
            user {params.user}</Alert>}

    {!isAuthenticated &&
        <Button
          variant={"contained"}
          color={"primary"}
          href={enableUrl}
          loading={goals.isLoading || update.isPending}
        >Enable Autodialer</Button>
    }

    {isAuthenticated && <>
      <p>Connected Beeminder user: <strong><a
        href={`https://beeminder.com/${params.user}`} target={"_blank"}
        rel={"nofollow noreferrer"}>{params.user}</a></strong></p>
      <Button
        variant="outlined"
        color="secondary"
        href={disableUrl}
        loading={remove.isPending}
      >Disable Autodialer</Button>
    </>}
  </>;
}
