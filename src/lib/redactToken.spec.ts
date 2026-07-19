import {redactToken} from "./redactToken";

describe("redactToken", () => {
  it("redacts an access_token query param", () => {
    expect(redactToken("https://x/goals.json?access_token=secret123&x=1"))
        .toBe("https://x/goals.json?access_token=REDACTED&x=1");
  });

  it("redacts a token at the end of the query", () => {
    expect(redactToken("https://x/u.json?filter=a&access_token=secret123"))
        .toBe("https://x/u.json?filter=a&access_token=REDACTED");
  });

  it("leaves URLs without a token untouched", () => {
    expect(redactToken("https://x/goals.json?filter=frontburner"))
        .toBe("https://x/goals.json?filter=frontburner");
  });
});
