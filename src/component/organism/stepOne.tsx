import { Alert } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import React, { useEffect } from "react";
import useUpdate from "../../lib/useUpdate";
import useRemove from "../../lib/useRemove";
import useGoals from "../../lib/useGoals";
import useParams from "../../lib/useParams";
import useIsAuthenticated from "../../lib/useIsAuthenticated";

export default function StepOne(): JSX.Element {
  const { user, token, disable } = useParams();
  const update = useUpdate();
  const remove = useRemove();
  const goals = useGoals();
  const isAuthenticated = useIsAuthenticated();
  const { REACT_APP_APP_URL = "", REACT_APP_BM_CLIENT_ID = "" } = process.env;
  const redirectUri = encodeURIComponent(REACT_APP_APP_URL);
  const enableUrl = `https://www.beeminder.com/apps/authorize?client_id=${REACT_APP_BM_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token`;
  const disableUrl = `/?access_token=${token}&username=${user}&disable=true`;

  useEffect(() => {
    if (!user || !token) return;

    if (disable) {
      remove.mutate({ user, token });
    } else {
      update.mutate({ user, token });
    }
  }, [user, token]);

  return (
    <>
      <h3>
        Step 1: Connect the autodialer to your{" "}
        <a href="https://beeminder.com">Beeminder</a> account
      </h3>

      {update.error && <Alert severity="error">{update.error.message}</Alert>}
      {remove.error && <Alert severity="error">{remove.error.message}</Alert>}
      {goals.error && <Alert severity="error">{goals.error.message}</Alert>}

      {remove.isSuccess && (
        <Alert severity="success">
          The autodialer has been disabled for Beeminder user {user}
        </Alert>
      )}

      {!isAuthenticated && (
        <LoadingButton
          variant={"contained"}
          color={"primary"}
          href={enableUrl}
          loading={goals.isLoading || update.isLoading}
        >
          Enable Autodialer
        </LoadingButton>
      )}

      {isAuthenticated && (
        <>
          <p>
            Connected Beeminder user:{" "}
            <strong>
              <a
                href={`https://beeminder.com/${user}`}
                target={"_blank"}
                rel={"nofollow noreferrer"}
              >
                {user}
              </a>
            </strong>
          </p>
          <LoadingButton
            variant="outlined"
            color="secondary"
            href={disableUrl}
            loading={remove.isLoading}
          >
            Disable Autodialer
          </LoadingButton>
        </>
      )}
    </>
  );
}
