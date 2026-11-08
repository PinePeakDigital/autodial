import { getSettings } from "./getSettings";
import { makeGoal } from "./test/fixtures";

describe("getSettings", () => {
  it("parses `from` option", () => {
    const settings = getSettings(
      makeGoal({
        fineprint: "#autodialFrom=from_slug",
      })
    );

    expect(settings.from).toBe("from_slug");
  });
});
