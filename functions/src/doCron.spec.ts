import * as Sentry from "@sentry/cloudflare";
import doCron from "./doCron";
import {
  dial,
  getGoals,
  Goal,
  GoalVerbose,
  Roadall,
  updateGoal,
  getGoal,
  now,
  SID,
  SkipDialError,
  BeeminderAuthError,
} from "../../src/lib";
import {setNow} from "../../src/lib/test/helpers";
import {getUsers, disableUser} from "./database";
import {makeGoal} from "./test/helpers";
import log from "../../src/lib/log";

jest.mock("@sentry/cloudflare");
jest.mock("../../src/lib/log");
jest.mock("./database");
jest.mock("../../src/lib/dial");
jest.mock("../../src/lib/beeminder");

const mockGetGoals = getGoals as jest.Mock;
const mockGetGoal = getGoal as jest.Mock;
const mockDial = dial as jest.Mock;
const mockGetUsers = getUsers as jest.Mock;
const mockDisableUser = disableUser as jest.Mock;
const mockLog = log as jest.Mock;
const mockCaptureException = Sentry.captureException as jest.Mock;

function setGoal(g: Partial<Goal>) {
  mockGetGoal.mockResolvedValue(g as GoalVerbose);
  mockGetGoals.mockResolvedValue([g as Goal]);
}

async function runCron() {
  const kv = {} as KVNamespace;
  await doCron(kv);
  return kv;
}

describe("function", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetGoals.mockResolvedValue([]);
    mockGetUsers.mockResolvedValue([
      {
        beeminder_user: "the_user",
        beeminder_token: "the_token",
      },
    ]);
  });

  it("gets beeminder goals", async () => {
    await runCron();

    expect(getGoals).toBeCalledWith("the_user", "the_token");
  });

  it("dials goals", async () => {
    const goal = makeGoal({
      fineprint: "#autodial",
    });

    setGoal(goal);

    await runCron();

    expect(dial).toBeCalledWith(goal, expect.anything());
  });

  it("supports min", async () => {
    const goal = makeGoal({
      fineprint: "#autodialMin=1.5",
    });

    setGoal(goal);

    await runCron();

    expect(dial).toBeCalledWith(goal, expect.objectContaining({min: 1.5}));
  });

  it("supports max", async () => {
    const goal = makeGoal({
      fineprint: "#autodialMax=1.5",
    });

    setGoal(goal);

    await runCron();

    expect(dial).toBeCalledWith(goal, expect.objectContaining({max: 1.5}));
  });

  it("skips goals without hashtag", async () => {
    const goal = makeGoal();

    setGoal(goal);

    await runCron();

    expect(dial).not.toBeCalled();
  });

  it("persists modified road", async () => {
    mockDial.mockReturnValue("the_new_road" as unknown as Roadall);

    const goal = makeGoal({
      fineprint: "#autodialMin=1",
    });

    setGoal(goal);

    await runCron();

    expect(updateGoal).toBeCalledWith("the_user", "the_token", "the_slug", {
      roadall: "the_new_road",
    });
  });

  it("does not update goal if goal not dialed", async () => {
    mockDial.mockReturnValue(false);

    const goal = makeGoal({
      fineprint: "#autodialMin=1",
    });

    setGoal(goal);

    await runCron();

    expect(updateGoal).not.toBeCalled();
  });

  it("handles getGoal 404s", async () => {
    const g = makeGoal({
      fineprint: "#autodial",
    });

    mockGetGoals.mockResolvedValue([g, g]);
    mockGetGoal.mockRejectedValue("the_error");

    await runCron();

    expect(mockGetGoal).toBeCalledTimes(2);
  });

  it("gets verbose goal with diffSince", async () => {
    setNow(2021, 2, 29);
    const diffSince = now() - SID * 31;

    const goal = makeGoal({
      fineprint: "#autodial",
    });

    setGoal(goal);

    await runCron();

    expect(getGoal).toBeCalledWith(
        "the_user",
        "the_token",
        "the_slug",
        diffSince
    );
  });

  it("pulls tags from goal title", async () => {
    const goal = makeGoal({
      title: "#autodial",
    });

    setGoal(goal);

    await runCron();

    expect(dial).toBeCalledWith(goal, expect.anything());
  });

  it("supports strict", async () => {
    const goal = makeGoal({
      fineprint: "#autodialStrict",
    });

    setGoal(goal);

    await runCron();

    expect(dial).toBeCalledWith(
        goal,
        expect.objectContaining({strict: true})
    );
  });

  it("supports from", async () => {
    const g = makeGoal({
      fineprint: "#autodialFrom=from_goal",
    });

    setGoal(g);

    await runCron();

    expect(getGoal).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        "from_goal",
        expect.anything()
    );
  });

  it("is case-insensitive", async () => {
    const goal = makeGoal({
      fineprint: "#autodialmin=1.5",
    });

    setGoal(goal);

    await runCron();

    expect(dial).toBeCalledWith(goal, expect.objectContaining({min: 1.5}));
  });

  it("does not report a skipped goal to Sentry", async () => {
    const goal = makeGoal({
      fineprint: "#autodial",
    });

    setGoal(goal);
    mockDial.mockImplementation(() => {
      throw new SkipDialError("Goal ends too soon to dial");
    });

    await runCron();

    expect(Sentry.captureException).not.toBeCalled();
  });

  it("logs the reason a goal was skipped", async () => {
    const goal = makeGoal({
      fineprint: "#autodial",
    });

    setGoal(goal);
    mockDial.mockImplementation(() => {
      throw new SkipDialError("Goal ends too soon to dial");
    });

    await runCron();

    expect(mockLog).toBeCalledWith(
        "skip dial goal the_user/the_slug: Goal ends too soon to dial"
    );
  });

  it("still reports a genuine dial failure to Sentry", async () => {
    const goal = makeGoal({
      fineprint: "#autodial",
    });
    const error = new Error("boom");

    setGoal(goal);
    mockDial.mockImplementation(() => {
      throw error;
    });

    await runCron();

    expect(mockCaptureException).toBeCalledWith(
        error,
        expect.objectContaining({
          extra: {beeminder_user: "the_user", slug: "the_slug"},
        })
    );
  });

  it("disables the user on a 401 from getGoals", async () => {
    const error = new BeeminderAuthError(401, "Fetch error: 401 - ...");
    mockGetGoals.mockRejectedValue(error);

    const kv = await runCron();

    expect(mockDisableUser).toBeCalledWith(
        kv,
        "the_user",
        "the_token",
        error.message
    );
  });

  it("disables the user on a 404 from getGoals", async () => {
    const error = new BeeminderAuthError(404, "Fetch error: 404 - ...");
    mockGetGoals.mockRejectedValue(error);

    const kv = await runCron();

    expect(mockDisableUser).toBeCalledWith(
        kv,
        "the_user",
        "the_token",
        error.message
    );
  });

  it("reports a disabled user to Sentry once, with the status", async () => {
    const error = new BeeminderAuthError(401, "Fetch error: 401 - ...");
    mockGetGoals.mockRejectedValue(error);
    mockDisableUser.mockResolvedValue(true);

    await runCron();

    expect(mockCaptureException).toBeCalledTimes(1);
    expect(mockCaptureException).toBeCalledWith(
        error,
        expect.objectContaining({
          extra: {beeminder_user: "the_user", status: 401},
        })
    );
  });

  it("reports the auth error even when the write is skipped", async () => {
    const error = new BeeminderAuthError(401, "Fetch error: 401 - ...");
    mockGetGoals.mockRejectedValue(error);
    mockDisableUser.mockResolvedValue(false);

    await runCron();

    expect(mockCaptureException).toBeCalledWith(
        error,
        expect.objectContaining({
          extra: {beeminder_user: "the_user", status: 401},
        })
    );
  });

  it("survives a KV failure while disabling", async () => {
    const error = new BeeminderAuthError(401, "Fetch error: 401 - ...");
    const writeError = new Error("KV unavailable");
    mockGetGoals.mockRejectedValue(error);
    mockDisableUser.mockRejectedValue(writeError);

    // The whole point: this must resolve rather than rejecting the Promise.all
    // and taking every other user's run down with it.
    await expect(runCron()).resolves.toBeDefined();

    expect(mockCaptureException).toBeCalledWith(
        writeError,
        expect.objectContaining({extra: {beeminder_user: "the_user"}})
    );
    expect(mockCaptureException).toBeCalledWith(
        error,
        expect.objectContaining({
          extra: {beeminder_user: "the_user", status: 401},
        })
    );
  });

  it("does not disable the user on a non-auth error (e.g. 500)", async () => {
    const error = new Error("Fetch error: 500 - ...");
    mockGetGoals.mockRejectedValue(error);

    await runCron();

    expect(mockDisableUser).not.toBeCalled();
    // The non-auth branch keeps its original payload shape: no status, and
    // no disabled flag, so a 500 stays visibly distinct from a dead token.
    expect(mockCaptureException).toBeCalledWith(error, {
      extra: {beeminder_user: "the_user"},
    });
  });

  it("does not disable on a per-goal auth error", async () => {
    const g = makeGoal({fineprint: "#autodial"});
    mockGetGoals.mockResolvedValue([g]);
    mockGetGoal.mockRejectedValue(
        new BeeminderAuthError(401, "Fetch error: 401 - ...")
    );

    await runCron();

    // Deliberate asymmetry: a per-goal 401/404 usually means the goal was
    // renamed or deleted, not that the credential died. Pinned so a future
    // refactor cannot quietly unify the two catch blocks in either direction.
    expect(mockDisableUser).not.toBeCalled();
    expect(mockCaptureException).toBeCalledWith(
        expect.any(BeeminderAuthError),
        expect.objectContaining({
          extra: expect.objectContaining({slug: g.slug}),
        })
    );
  });

  it("skips a disabled user without fetching goals", async () => {
    mockGetUsers.mockResolvedValue([
      {
        beeminder_user: "the_user",
        beeminder_token: "the_token",
        disabledAt: 1700000000000,
      },
    ]);

    await runCron();

    expect(mockGetGoals).not.toBeCalled();
    expect(mockCaptureException).not.toBeCalled();
  });
});

// TODO:
// log beeminder exceptions
