import * as Sentry from "@sentry/cloudflare";
import doCron from "./doCron";
import doUpdate from "./doUpdate";
import doRemove from "./doRemove";
import {redactToken} from "../../src/lib/redactToken";
import {importTokenKey} from "./tokenCrypto";
import {BeeminderError} from "../../src/lib/beeminderError";

export interface Env {
  USERS: KVNamespace;
  // "true" locally to skip writing goals back to Beeminder (wrangler dev)
  DRY_RUN?: string;
  // Sentry DSN; unset disables Sentry (no-op).
  SENTRY_DSN?: string;
  // base64 of 32 random bytes; seals access tokens in KV. Required: without
  // it the cron and /update throw rather than store plaintext.
  TOKEN_KEY?: string;
}

// Exported unwrapped for tests; the default export wraps these with Sentry.
export const handlers = {
  // Cron trigger — replaces the old public HTTP cron endpoint
  // + Cloud Scheduler.
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const key = await importTokenKey(env.TOKEN_KEY);
    await doCron(env.USERS, key, env.DRY_RUN === "true");
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== "POST") {
      return new Response("Method not allowed", {status: 405});
    }

    const {pathname} = new URL(req.url);

    // Route before reading the body. Scanners POST junk at paths like
    // /index.php; parsing first turned every one of those into a JSON
    // SyntaxError, a captured Sentry event and a 500, and the 404 below was
    // unreachable for them.
    if (pathname !== "/update" && pathname !== "/remove") {
      return new Response("Not found", {status: 404});
    }

    try {
      // Any `user` field the client sends is ignored: getMe asks Beeminder
      // whose access token this is.
      const {token} = await req.json<{ token: string }>();

      if (pathname === "/update") {
        await doUpdate(env.USERS, await importTokenKey(env.TOKEN_KEY), token);
      } else {
        await doRemove(env.USERS, token);
      }

      return new Response("Success", {status: 200});
    } catch (e) {
      // A rejected access token is the caller's problem, not a Worker fault.
      if (e instanceof BeeminderError && e.kind === "credential-rejected") {
        return new Response("Unauthorized", {status: 401});
      }
      Sentry.captureException(e);
      console.error(e);
      return new Response("Error", {status: 500});
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
    handlers as unknown as Parameters<typeof Sentry.withSentry>[1],
);
