import * as Sentry from "@sentry/cloudflare";
import doCron from "./doCron";
import doUpdate from "./doUpdate";
import doRemove from "./doRemove";
import {redactToken} from "../../src/lib/redactToken";

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
      sendDefaultPii: false,
      // The Beeminder token rides in outgoing fetch URLs; keep it out of the
      // breadcrumb trail and the captured event.
      beforeBreadcrumb(breadcrumb) {
        if (typeof breadcrumb.data?.url === "string") {
          breadcrumb.data.url = redactToken(breadcrumb.data.url);
        }
        return breadcrumb;
      },
      beforeSend(event) {
        if (event.request?.url) {
          event.request.url = redactToken(event.request.url);
        }
        // We never want the request body (it carries the token) in an event.
        if (event.request?.data) {
          event.request.data = "[REDACTED]";
        }
        event.breadcrumbs?.forEach((b) => {
          if (typeof b.data?.url === "string") {
            b.data.url = redactToken(b.data.url);
          }
        });
        return event;
      },
    }),
    // @sentry/cloudflare's declared handler Request type diverges from our
    // workers-types Request; the shape is correct at runtime (handlers is
    // fully typed above). Cast to withSentry's own param type (avoids the
    // ban-ts-comment rule that forbids @ts-expect-error here).
    handlers as unknown as Parameters<typeof Sentry.withSentry>[1]
);
