import * as Sentry from "@sentry/cloudflare";
import {getUsers, disableUser} from "./database";
import log from "../../src/lib/log";
import {
  getGoal,
  getGoals,
  updateGoal,
  dial,
  Goal,
  getSettings, now, SID,
  SkipDialError,
  BeeminderAuthError,
} from "../../src/lib";

/* eslint-disable camelcase */

const doCron = async (kv: KVNamespace, dryRun = false): Promise<void> => {
  log(dryRun);

  const users = await getUsers(kv);

  await Promise.all(users.map(async (
      {beeminder_user, beeminder_token, disabledAt},
  ) => {
    if (!beeminder_user || !beeminder_token) {
      log("missing user auth");
      return;
    }

    if (disabledAt) {
      log(`skip disabled user ${beeminder_user}`);
      return;
    }

    try {
      const all = await getGoals(beeminder_user, beeminder_token);
      const toDial = all.filter((g: Goal) => getSettings(g).autodial);

      await Promise.all(toDial.map(async (g) => {
        log(`start dial goal ${beeminder_user}/${g.slug}`);
        try {
          const settings = getSettings(g);
          const diffSince = now() - (SID * 31);
          const fullGoal = await getGoal(
              beeminder_user,
              beeminder_token,
              g.slug,
              diffSince,
          );
          settings.fromGoal = settings.from && await getGoal(
              beeminder_user, beeminder_token, settings.from, diffSince
          ) || undefined;
          const roadall = dial(fullGoal, settings);
          const newRate = roadall && roadall[roadall.length - 1][2];
          const id = `${beeminder_user}/${g.slug}`;

          log(`end dial goal ${id}: ${newRate}`);

          if (!roadall) return;

          if (!dryRun) {
            await updateGoal(
                beeminder_user,
                beeminder_token,
                g.slug,
                {roadall}
            );
          }
        } catch (e) {
          // Deliberately no BeeminderAuthError branch here: a per-goal 401/404
          // usually means that goal was renamed or deleted, not that the
          // credential is dead, so it stays a per-goal error. Only the
          // account-level getGoals failure below disables a user.
          if (e instanceof SkipDialError) {
            log(`skip dial goal ${beeminder_user}/${g.slug}: ${e.message}`);
          } else {
            Sentry.captureException(e, {extra: {beeminder_user, slug: g.slug}});
            log({m: "failed to dial goal", g, e});
          }
        }
      }));
    } catch (e) {
      if (e instanceof BeeminderAuthError) {
        // Report the auth failure BEFORE attempting the write, so it is
        // recorded no matter what the write does. A KV hiccup must also not
        // reject the surrounding Promise.all and take the whole run down --
        // 9ce8c8e added the per-user try/catch precisely for that isolation.
        Sentry.captureException(e, {
          extra: {beeminder_user, status: e.status},
        });

        try {
          const disabled = await disableUser(
              kv, beeminder_user, beeminder_token, e.message
          );
          log({
            m: disabled ? "disabled user" : "auth error, user record moved on",
            beeminder_user,
            status: e.status,
          });
        } catch (writeError) {
          Sentry.captureException(writeError, {extra: {beeminder_user}});
          log({m: "failed to disable user", beeminder_user, e: writeError});
        }
      } else {
        Sentry.captureException(e, {extra: {beeminder_user}});
        log({m: "failed to handle user", beeminder_user, e});
      }
    }
  }));
};

export default doCron;
