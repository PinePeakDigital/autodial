import {readFileSync} from "node:fs";

// Importing index.tsx would mount the app, so check the source instead: the
// token must leave the URL before Sentry starts recording it.
describe("index", () => {
  it("takes credentials from the URL before Sentry starts", () => {
    const src = readFileSync("src/index.tsx", "utf8");
    const take = src.indexOf("takeCredentialsFromUrl();");
    expect(take).toBeGreaterThan(-1);
    expect(take).toBeLessThan(src.indexOf("Sentry.init("));
  });
});
