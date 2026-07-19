import * as Sentry from "@sentry/cloudflare";
import doCron from "./doCron";
import doUpdate from "./doUpdate";
import doRemove from "./doRemove";

export interface Env {
  USERS: KVNamespace;
  // "true" locally to skip writing goals back to Beeminder (wrangler dev)
  DRY_RUN?: string;
  // Sentry DSN; unset disables Sentry (no-op).
  SENTRY_DSN?: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "3600",
};

// Exported unwrapped for tests; the default export wraps these with Sentry.
export const handlers = {
  // Cron trigger — replaces the old public HTTP cron endpoint
  // + Cloud Scheduler.
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await doCron(env.USERS, env.DRY_RUN === "true");
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, {status: 204, headers: CORS});
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", {status: 405, headers: CORS});
    }

    const {pathname} = new URL(req.url);

    try {
      const {user, token} = await req.json<{ user: string; token: string }>();

      if (pathname === "/update") {
        await doUpdate(env.USERS, user, token);
      } else if (pathname === "/remove") {
        await doRemove(env.USERS, user, token);
      } else {
        return new Response("Not found", {status: 404, headers: CORS});
      }

      return new Response("Success", {status: 200, headers: CORS});
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return new Response("Error", {status: 500, headers: CORS});
    }
  },
};

export default Sentry.withSentry(
    (env: Env) => ({
      dsn: env.SENTRY_DSN,
      // Errors only; no performance tracing.
      tracesSampleRate: 0,
    }),
    // @sentry/cloudflare's declared handler Request type diverges from our
    // workers-types Request; the shape is correct at runtime (handlers is
    // fully typed above).
    // @ts-expect-error - upstream workers-types Request skew
    handlers
);
