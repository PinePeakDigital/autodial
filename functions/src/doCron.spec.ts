import doCron from "./doCron";
import {
  dial,
  getGoals,
  Goal,
  GoalVerbose,
  Roadall,
  updateGoal,
  getGoal,
  setNow,
  now,
  SID,
} from "../../src/lib";
import { getUsers } from "./database";
import { makeGoal } from "./test/helpers";

jest.mock("../../src/lib/log");
jest.mock("./database");
jest.mock("../../src/lib/dial");
jest.mock("../../src/lib/beeminder");

const mockGetGoals = getGoals as jest.Mock;
const mockGetGoal = getGoal as jest.Mock;
const mockDial = dial as jest.Mock;
const mockGetUsers = getUsers as jest.Mock;

function setGoal(g: Partial<Goal>) {
  mockGetGoal.mockResolvedValue(g as GoalVerbose);
  mockGetGoals.mockResolvedValue([g as Goal]);
}

async function runCron() {
  await doCron({} as KVNamespace);
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

    expect(dial).toBeCalledWith(goal, expect.objectContaining({ min: 1.5 }));
  });

  it("supports max", async () => {
    const goal = makeGoal({
      fineprint: "#autodialMax=1.5",
    });

    setGoal(goal);

    await runCron();

    expect(dial).toBeCalledWith(goal, expect.objectContaining({ max: 1.5 }));
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
      expect.objectContaining({ strict: true })
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

    expect(dial).toBeCalledWith(goal, expect.objectContaining({ min: 1.5 }));
  });
});

// TODO:
// log dial exceptions
// log beeminder exceptions
