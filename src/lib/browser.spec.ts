import {
  takeCredentialsFromUrl,
  getCredentials,
  clearCredentials,
} from "./browser";

describe("browser", () => {
  beforeEach(() => {
    clearCredentials();
    vi.restoreAllMocks();
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
      expect(JSON.parse(sessionStorage.getItem("autodial_credentials") ?? ""))
          .toEqual({user: "alice", token: "abc"});
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

    it("drops the token from an old disable link", () => {
      window.history.replaceState(
          null, "", "/?access_token=abc&username=alice&disable=true",
      );

      takeCredentialsFromUrl();

      expect(window.location.search).toBe("");
      expect(getCredentials()).toEqual({user: null, token: null});
    });

    it("still cleans the URL and signs in when storage is blocked", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      window.history.replaceState(
          null, "", "/?access_token=abc&username=alice",
      );

      takeCredentialsFromUrl();

      expect(window.location.search).toBe("");
      expect(getCredentials()).toEqual({user: "alice", token: "abc"});
    });

    it("drops an older stored user when the new write fails", () => {
      sessionStorage.setItem(
          "autodial_credentials", JSON.stringify({user: "bob", token: "old"}),
      );
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      window.history.replaceState(
          null, "", "/?access_token=abc&username=alice",
      );

      takeCredentialsFromUrl();

      expect(sessionStorage.getItem("autodial_credentials")).toBeNull();
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
