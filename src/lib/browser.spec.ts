import {
  takeCredentialsFromUrl,
  getCredentials,
  clearCredentials,
} from "./browser";

describe("browser", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  describe("takeCredentialsFromUrl", () => {
    it("moves the token into sessionStorage and cleans the URL", () => {
      window.history.replaceState(
          null, "", "/?access_token=abc&username=alice",
      );

      takeCredentialsFromUrl();

      expect(window.location.search).toBe("");
      expect(getCredentials()).toEqual({user: "alice", token: "abc"});
    });

    it("leaves stored credentials alone when the URL has none", () => {
      window.history.replaceState(
          null, "", "/?access_token=abc&username=alice",
      );
      takeCredentialsFromUrl();
      window.history.replaceState(null, "", "/?other=1");

      takeCredentialsFromUrl();

      expect(window.location.search).toBe("?other=1");
      expect(getCredentials()).toEqual({user: "alice", token: "abc"});
    });
  });

  describe("getCredentials", () => {
    it("returns nulls when nothing is stored", () => {
      expect(getCredentials()).toEqual({user: null, token: null});
    });

    it("returns nulls for a corrupt entry", () => {
      sessionStorage.setItem("autodial_credentials", "{");
      expect(getCredentials()).toEqual({user: null, token: null});
    });
  });

  describe("clearCredentials", () => {
    it("forgets the stored token", () => {
      window.history.replaceState(null, "", "/?access_token=abc&username=a");
      takeCredentialsFromUrl();

      clearCredentials();

      expect(getCredentials()).toEqual({user: null, token: null});
    });
  });
});
