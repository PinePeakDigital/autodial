import React from "react";
import type { Mock } from "vitest";
import { waitFor, screen, fireEvent } from "@testing-library/react";
import App from "./App";

import { getCredentials, clearCredentials } from "./lib/browser";
import {
  getGoal,
  getGoals,
  getGoalsVerbose,
  GoalVerbose,
  parseDate,
  now,
  SID,
} from "./lib";
import { setNow, r, withMutedReactQueryLogger } from "./lib/test/helpers";
import { GoalInput, makeGoal } from "./lib/test/fixtures";
import { remove, update } from "./lib/functions";

vi.mock("./lib/browser");
vi.mock("./lib/functions");
vi.mock("./lib/beeminder");

const mockGetCredentials = getCredentials as Mock;
const mockUpdate = update as Mock;
const mockRemove = remove as Mock;
const mockGetGoals = getGoals as Mock;
const mockGetGoalsVerbose = getGoalsVerbose as Mock;
const mockGetGoal = getGoal as Mock;

function loadParams(params: string) {
  const p = new URLSearchParams(params);
  mockGetCredentials.mockReturnValue({
    user: p.get("username"),
    token: p.get("access_token"),
  });
}

async function disable() {
  fireEvent.click(await screen.findByText("Disable Autodialer"));
}

function loadGoals(goals: GoalInput[]) {
  const goals_: Partial<GoalVerbose>[] = goals.map((g, i) =>
    makeGoal({
      slug: `slug_${i}`,
      runits: "d",
      fineprint: "#autodial",
      aggday: "sum",
      roadall: [
        [parseDate("20090210"), 0, null],
        [parseDate("20090315"), null, g.rate === undefined ? 1 : g.rate],
      ],
      ...g,
    })
  );

  mockGetGoal.mockImplementation((slug: string) => {
    return {
      datapoints: [],
      ...goals_.find((g) => g.slug === slug),
    };
  });
  mockGetGoalsVerbose.mockResolvedValue(
    goals_.map((g) => ({
      datapoints: [],
      ...g,
    }))
  );
  mockGetGoals.mockResolvedValue(goals_);
}

describe("Home page", () => {
  beforeEach(() => {
    mockUpdate.mockResolvedValue(null);
    loadGoals([{ slug: "the_slug" }]);
    loadParams("?access_token=abc123&username=the_user");
  });

  it("has authenticate button", async () => {
    loadParams("");

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("Enable Autodialer")).toBeInTheDocument();
    });
  });

  it("links authenticate link", async () => {
    loadParams("");

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("Enable Autodialer")).toHaveAttribute(
        "href",
        expect.stringContaining("https://www.beeminder.com/apps/authorize")
      );
    });
  });

  describe("with mocked env", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("includes client id in authenticate url", async () => {
      loadParams("");

      vi.stubEnv("VITE_BM_CLIENT_ID", "the_client_id");

      const { getByText } = await r(<App />);

      await waitFor(() => {
        expect(getByText("Enable Autodialer")).toHaveAttribute(
          "href",
          expect.stringContaining("the_client_id")
        );
      });
    });

    it("includes client secret in authenticate url", async () => {
      loadParams("");

      vi.stubEnv("VITE_APP_URL", "http://the_app_url");

      const { getByText } = await r(<App />);

      await waitFor(() => {
        expect(getByText("Enable Autodialer")).toHaveAttribute(
          "href",
          expect.stringContaining(encodeURIComponent("http://the_app_url"))
        );
      });
    });
  });

  it("persists credentials", async () => {
    await r(<App />);

    await waitFor(() => {
      expect(update).toBeCalledWith("the_user", "abc123");
    });
  });

  it("does not persist credentials if none passed", async () => {
    loadParams("");

    await r(<App />);

    expect(update).not.toBeCalled();
  });

  it("gets user goals", async () => {
    setNow(2021, 2, 29);
    const diffSince = now() - SID * 31;

    await r(<App />);

    await waitFor(() => {
      expect(getGoalsVerbose).toBeCalledWith("abc123", diffSince);
    });
  });

  it("displays Beeminder error message", async () => {
    await withMutedReactQueryLogger(async () => {
      mockGetGoalsVerbose.mockRejectedValue(new Error("the_error_message"));

      const { getByText } = await r(<App />);

      await waitFor(() => {
        expect(getByText("the_error_message")).toBeInTheDocument();
      });
    });
  });

  it("displays beeminder username", async () => {
    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("the_user")).toBeInTheDocument();
    });
  });

  it("lists goal slugs", async () => {
    loadGoals([{ slug: "the_slug" }]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("the_slug")).toBeInTheDocument();
    });
  });

  it("lists slugs alphabetically", async () => {
    loadGoals([{ slug: "b_slug" }, { slug: "a_slug" }]);

    await r(<App />);

    await waitFor(() => {
      const html = document.body.innerHTML;
      const a = html.search("a_slug");
      const b = html.search("b_slug");
      expect(a).toBeLessThan(b);
    });
  });

  it("hides goals table if user not authenticated", async () => {
    loadParams("");

    const { queryByText } = await r(<App />);

    expect(queryByText("Here are your goals:")).not.toBeInTheDocument();
  });

  it("displays min value", async () => {
    // Pin the clock: the fixture's roadall ends 2009-03-15, and dial() skips
    // goals whose road already ended, which — unmocked — depends on how far
    // "now" has drifted past that date. Pre-existing on master, unrelated to
    // the vitest migration (reproduces under the old jest suite too).
    setNow(2009, 3, 4);
    loadGoals([{ slug: "the_slug", rate: 3, fineprint: "#autodialMin=1.5" }]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("1.5/d")).toBeInTheDocument();
    });
  });

  it("displays positive value", async () => {
    // See the comment in "displays min value" above — same pre-existing
    // wall-clock dependency, pinned the same way.
    setNow(2009, 3, 4);
    loadGoals([{ slug: "the_slug", rate: 3, fineprint: "#autodialMax=1" }]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("1/d")).toBeInTheDocument();
    });
  });

  it("removes login button when data loads successfully", async () => {
    const { queryByText } = await r(<App />);

    await waitFor(() => {
      expect(queryByText("Enable Autodialer")).not.toBeInTheDocument();
    });
  });

  it("includes disable button", async () => {
    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("Disable Autodialer")).toBeInTheDocument();
    });
  });

  it("forgets stored credentials after disabling", async () => {
    const { getByText } = await r(<App />);
    await disable();

    await waitFor(() => {
      expect(
        getByText(
          "The autodialer has been disabled for Beeminder user the_user"
        )
      ).toBeInTheDocument();
    });

    expect(clearCredentials).toBeCalled();
    expect(getByText("Enable Autodialer")).toBeInTheDocument();
  });

  it("stays signed in when disabling fails", async () => {
    await withMutedReactQueryLogger(async () => {
      mockRemove.mockRejectedValue({ message: "the_error" });

      await r(<App />);
      await disable();

      await screen.findByText("the_error");
      expect(screen.getByText("Disable Autodialer")).toBeInTheDocument();
      expect(clearCredentials).not.toBeCalled();
    });
  });

  it("blocks disabling until the on-load update finishes", async () => {
    mockUpdate.mockReturnValue(new Promise(() => {}));

    await r(<App />);

    await waitFor(() => {
      expect(screen.getByText("Disable Autodialer").closest("button"))
        .toBeDisabled();
    });
  });

  it("deletes database user on disable", async () => {
    await r(<App />);
    await disable();

    await waitFor(() => {
      expect(remove).toBeCalledWith("the_user", "abc123");
    });
  });

  it("does not show goals for disabled user", async () => {
    const { getByText, queryByText } = await r(<App />);
    await disable();

    await waitFor(() => {
      expect(
        getByText(
          "The autodialer has been disabled for Beeminder user the_user"
        )
      ).toBeInTheDocument();
    });

    expect(queryByText("Here are your goals:")).not.toBeInTheDocument();
  });

  it("does not get goals if no username", async () => {
    loadParams("");

    await r(<App />);

    expect(getGoals).not.toBeCalled();
  });

  it("only shows enabled goals", async () => {
    loadGoals([
      { slug: "slug_a", fineprint: "" },
      { slug: "slug_b", fineprint: "#autodial" },
    ]);

    const { queryByText, getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("slug_b")).toBeInTheDocument();
    });

    expect(queryByText("slug_a")).not.toBeInTheDocument();
  });

  it("links slugs", async () => {
    loadGoals([{ slug: "the_slug" }]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("the_slug")).toHaveAttribute(
        "href",
        "https://beeminder.com/the_user/the_slug"
      );
    });
  });

  it("links username", async () => {
    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("the_user")).toHaveAttribute(
        "href",
        "https://beeminder.com/the_user"
      );
    });
  });

  it("includes historical average", async () => {
    setNow(2009, 3, 4);

    loadGoals([
      {
        slug: "the_slug",
        rate: 3,
        roadall: [
          [parseDate("20090210"), 0, null],
          [parseDate("20090315"), null, 3],
        ],
        datapoints: [
          { value: 0, daystamp: "20090210" },
          {
            value: 30,
            daystamp: "20090213",
          },
        ],
      },
    ]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("1/d")).toBeInTheDocument();
    });
  });

  it("reports average in terms of runits", async () => {
    setNow(2009, 3, 4);

    loadGoals([
      {
        slug: "the_slug",
        rate: 3,
        runits: "m",
        roadall: [
          [parseDate("20090210"), 0, null],
          [parseDate("20090315"), null, 1],
        ],
        datapoints: [
          { value: 0, daystamp: "20090210" },
          {
            value: 30,
            daystamp: "20090213",
          },
        ],
      },
    ]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("30.44/m")).toBeInTheDocument();
    });
  });

  it("shows rate changes", async () => {
    setNow(2009, 3, 4);

    loadGoals([
      {
        slug: "the_slug",
        rate: 3,
        runits: "m",
        roadall: [
          [parseDate("20090210"), 0, null],
          [parseDate("20090315"), null, 1],
        ],
        datapoints: [
          { value: 0, daystamp: "20090210" },
          {
            value: 30,
            daystamp: "20090213",
          },
        ],
      },
    ]);

    const { getByLabelText, getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByLabelText("pending change")).toBeInTheDocument();
      expect(getByText("22.59/m")).toBeInTheDocument();
    });
  });

  it("does not show rate change when none pending", async () => {
    setNow(2009, 3, 4);

    const oldRate = 0;

    loadGoals([
      {
        slug: "the_slug",
        rate: oldRate,
        runits: "m",
        roadall: [
          [parseDate("20090210"), 0, null],
          [parseDate("20090315"), null, oldRate],
        ],
        datapoints: [{ value: 0, daystamp: "20090210" }],
      },
    ]);

    const { queryByLabelText, getAllByText } = await r(<App />);

    await waitFor(() => {
      expect(getAllByText("0/m")).toBeTruthy();
    });

    expect(queryByLabelText("pending change")).not.toBeInTheDocument();
  });

  it("shows strict setting", async () => {
    setNow(2009, 3, 4);

    loadGoals([
      {
        slug: "the_slug",
        fineprint: "#autodialStrict",
      },
    ]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("yes")).toBeInTheDocument();
    });
  });

  it("displays update error", async () => {
    await withMutedReactQueryLogger(async () => {
      mockUpdate.mockRejectedValue({ message: "the_error" });

      await r(<App />);

      await waitFor(() => {
        expect(screen.getByText("the_error")).toBeInTheDocument();
      });
    });
  });

  it("displays remove error", async () => {
    await withMutedReactQueryLogger(async () => {
      mockRemove.mockRejectedValue({ message: "the_error" });
      await r(<App />);
      await disable();

      await waitFor(() => {
        expect(screen.getByText("the_error")).toBeInTheDocument();
      });
    });
  });

  it("shows from setting", async () => {
    setNow(2009, 3, 4);

    loadGoals([
      {
        slug: "the_slug",
        fineprint: "#autodialFrom=from_slug",
      },
    ]);

    await r(<App />);

    await expect(screen.findByText("from_slug")).resolves.toHaveAttribute(
      "href",
      "https://beeminder.com/the_user/from_slug"
    );
  });

  it("shows add setting", async () => {
    setNow(2009, 3, 4);

    loadGoals([
      {
        slug: "the_slug",
        fineprint: "#autodialAdd=3.333",
      },
    ]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("3.333")).toBeInTheDocument();
    });
  });

  it("shows times setting", async () => {
    setNow(2009, 3, 4);

    loadGoals([
      {
        slug: "the_slug",
        fineprint: "#autodialTimes=3",
      },
    ]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(getByText("3")).toBeInTheDocument();
    });
  });

  it("shows dialer errors", async () => {
    setNow(2009, 3, 4);

    loadGoals([
      {
        slug: "the_slug",
        odom: true,
      },
    ]);

    const { getByText } = await r(<App />);

    await waitFor(() => {
      expect(
        getByText("Odometer-type goals are not supported")
      ).toBeInTheDocument();
    });
  });
});

// TODO:
// add route to handle de-authorizing the app from Beeminder side (will need
//   de-auth cloud function to handle post data)
