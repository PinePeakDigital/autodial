import worker, {Env} from "./index";
import doUpdate from "./doUpdate";
import doRemove from "./doRemove";
import doCron from "./doCron";

jest.mock("./doUpdate");
jest.mock("./doRemove");
jest.mock("./doCron");

// jest 27's node env has no global Response; the worker only ever constructs
// one and the tests read .status / .headers.get, so a tiny stand-in suffices.
class FakeResponse {
  status: number;
  headers: { get: (k: string) => string | null };
  constructor(
      _body: unknown,
      init?: {status?: number; headers?: Record<string, string>}
  ) {
    this.status = init?.status ?? 200;
    const h = new Map(Object.entries(init?.headers ?? {}));
    this.headers = {get: (k) => h.get(k) ?? null};
  }
}
(global as unknown as { Response: unknown }).Response = FakeResponse;

const env = {USERS: {} as KVNamespace} as Env;

// The worker reads only req.method, req.url and req.json(), so a plain object
// stands in for a Request without needing the (absent) global.
function req(method: string, path: string, body?: unknown): Request {
  return {
    method,
    url: `https://w.dev${path}`,
    json: async () => body,
  } as unknown as Request;
}

describe("worker fetch", () => {
  it("answers OPTIONS preflight with CORS", async () => {
    const res = await worker.fetch(req("OPTIONS", "/update"), env);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("rejects non-POST methods", async () => {
    const res = await worker.fetch(req("GET", "/update"), env);
    expect(res.status).toBe(405);
  });

  it("routes /update to doUpdate", async () => {
    const res = await worker.fetch(
        req("POST", "/update", {user: "u", token: "t"}),
        env
    );
    expect(res.status).toBe(200);
    expect(doUpdate).toBeCalledWith(env.USERS, "u", "t");
  });

  it("routes /remove to doRemove", async () => {
    const res = await worker.fetch(
        req("POST", "/remove", {user: "u", token: "t"}),
        env
    );
    expect(res.status).toBe(200);
    expect(doRemove).toBeCalledWith(env.USERS, "u", "t");
  });

  it("404s unknown paths", async () => {
    const res = await worker.fetch(req("POST", "/nope", {}), env);
    expect(res.status).toBe(404);
  });

  it("500s when a handler throws", async () => {
    (doUpdate as jest.Mock).mockRejectedValueOnce(new Error("boom"));
    const res = await worker.fetch(
        req("POST", "/update", {user: "u", token: "t"}),
        env
    );
    expect(res.status).toBe(500);
  });
});

describe("worker scheduled", () => {
  it("dials all users, passing the DRY_RUN flag", async () => {
    await worker.scheduled(
        {} as ScheduledController,
        {USERS: {} as KVNamespace, DRY_RUN: "true"}
    );
    expect(doCron).toBeCalledWith(expect.anything(), true);
  });
});
