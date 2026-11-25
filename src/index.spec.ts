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

  // Sentry 11 collects user info and cookies unless dataCollection says not to.
  it("keeps Sentry's personal-data collection switched off", () => {
    const src = readFileSync("src/index.tsx", "utf8");
    const flags = [
      "userInfo:\\s*false",
      "cookies:\\s*false",
      "httpBodies:\\s*\\[\\]",
    ];
    const pattern = new RegExp(`dataCollection:\\s*\\{${flags.join("[^}]*")}`);
    expect(src).toMatch(pattern);
  });
});
