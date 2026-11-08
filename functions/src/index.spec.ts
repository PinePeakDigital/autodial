import * as Sentry from "@sentry/cloudflare";
import {handlers, Env} from "./index";
import doUpdate from "./doUpdate";
import doRemove from "./doRemove";
import doCron from "./doCron";
import {BeeminderError} from "../../src/lib/beeminderError";

jest.mock("@sentry/cloudflare");
jest.mock("./doUpdate");
jest.mock("./doRemove");
jest.mock("./doCron");

// jest's node test env doesn't reliably expose global Response; the worker
// only ever constructs one and the tests read .status / .headers.get, so a
// tiny stand-in suffices.
class FakeResponse {
  status: number;
  headers: { get: (k: string) => string | null };
  constructor(
      _body: unknown,
      init?: {status?: number; headers?: Record<string, string>},
  ) {
    this.status = init?.status ?? 200;
    const h = new Map(Object.entries(init?.headers ?? {}));
    this.headers = {get: (k) => h.get(k) ?? null};
  }
}
(global as unknown as { Response: unknown }).Response = FakeResponse;

const env = {USERS: {} as KVNamespace, TOKEN_KEY: "A".repeat(43) + "="} as Env;

// The worker reads only req.method, req.url and req.json(), so a plain object
// stands in for a Request without needing the (absent) global.
function req(method: string, path: string, body?: unknown): Request {
  return {
    method,
    url: `https://w.dev${path}`,
    json: async () => body,
  } as unknown as Request;
}

// A real Request rejects from .json() when the body isn't JSON. The `req`
// helper above always resolves, which is why the existing 404 test passed
// while production 500'd on the same shape.
function reqWithUnparsableBody(method: string, path: string): Request {
  return {
    method,
    url: `https://w.dev${path}`,
    json: async () => {
      throw new SyntaxError(
          "No number after minus sign in JSON at position 1 (line 1 column 2)",
      );
    },
  } as unknown as Request;
}

describe("worker fetch", () => {
  // Same-origin only: no preflight, no CORS headers for other sites.
  it("rejects OPTIONS without CORS headers", async () => {
    const res = await handlers.fetch(req("OPTIONS", "/update"), env);
    expect(res.status).toBe(405);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("rejects non-POST methods", async () => {
    const res = await handlers.fetch(req("GET", "/update"), env);
    expect(res.status).toBe(405);
  });

  it("routes /update to doUpdate", async () => {
    const res = await handlers.fetch(
        req("POST", "/update", {user: "u", token: "t"}),
        env,
    );
    expect(res.status).toBe(200);
    expect(doUpdate).toHaveBeenCalledWith(env.USERS, expect.anything(), "t");
  });

  it("routes /remove to doRemove", async () => {
    const res = await handlers.fetch(
        req("POST", "/remove", {user: "u", token: "t"}),
        env,
    );
    expect(res.status).toBe(200);
    expect(doRemove).toHaveBeenCalledWith(env.USERS, "t");
  });

  it("500s /update without TOKEN_KEY, storing nothing", async () => {
    const res = await handlers.fetch(
        req("POST", "/update", {token: "t"}),
        {USERS: {} as KVNamespace},
    );
    expect(res.status).toBe(500);
    expect(doUpdate).not.toHaveBeenCalled();
  });

  it("404s unknown paths", async () => {
    const res = await handlers.fetch(req("POST", "/nope", {}), env);
    expect(res.status).toBe(404);
  });

  // Scanners POST junk at /index.php ~60 times over six weeks. Each one used
  // to parse first, throw, and be captured as a Sentry error.
  it("404s an unknown path without reading the body", async () => {
    (Sentry.captureException as jest.Mock).mockClear();
    const res = await handlers.fetch(
        reqWithUnparsableBody("POST", "/index.php"),
        env,
    );
    expect(res.status).toBe(404);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("500s when a handler throws", async () => {
    (doUpdate as jest.Mock).mockRejectedValueOnce(new Error("boom"));
    const res = await handlers.fetch(
        req("POST", "/update", {user: "u", token: "t"}),
        env,
    );
    expect(res.status).toBe(500);
  });

  it.each(["/update", "/remove"])(
      "401s %s on a rejected credential, without Sentry",
      async (path) => {
        (Sentry.captureException as jest.Mock).mockClear();
        const e = new BeeminderError("credential-rejected", 401, "Fetch error");
        ((path === "/update" ? doUpdate : doRemove) as jest.Mock)
            .mockRejectedValueOnce(e);
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        const res = await handlers.fetch(
            req("POST", path, {token: "tok-secret"}), env,
        );
        expect(res.status).toBe(401);
        expect(Sentry.captureException).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(
            {m: "credential rejected", path, status: 401},
        );
        expect(JSON.stringify(warn.mock.calls)).not.toContain("tok-secret");
        warn.mockRestore();
      },
  );

  it("500s and reports a Beeminder error that is not a rejection", async () => {
    (Sentry.captureException as jest.Mock).mockClear();
    (doUpdate as jest.Mock).mockRejectedValueOnce(
        new BeeminderError("other", 500, "Fetch error"),
    );
    const res = await handlers.fetch(req("POST", "/update", {token: "t"}), env);
    expect(res.status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  // The route check now runs before the body is parsed, but a known route
  // still needs to parse its body — an unparsable one there is a real
  // application error, not scanner noise, and must still be reported.
  it(
      "500s and reports to Sentry on an unparsable known-route body",
      async () => {
        (Sentry.captureException as jest.Mock).mockClear();
        const res = await handlers.fetch(
            reqWithUnparsableBody("POST", "/update"),
            env,
        );
        expect(res.status).toBe(500);
        expect(Sentry.captureException).toHaveBeenCalled();
      },
  );
});

describe("worker scheduled", () => {
  it("dials all users, passing the DRY_RUN flag", async () => {
    await handlers.scheduled(
        {} as ScheduledController,
        {...env, DRY_RUN: "true"},
    );
    expect(doCron).toHaveBeenCalledWith(
        env.USERS, expect.anything(), true,
    );
  });

  it("refuses to run without TOKEN_KEY", async () => {
    await expect(handlers.scheduled(
        {} as ScheduledController,
        {USERS: {} as KVNamespace},
    )).rejects.toThrow("TOKEN_KEY is not set");
    expect(doCron).not.toHaveBeenCalled();
  });
});
