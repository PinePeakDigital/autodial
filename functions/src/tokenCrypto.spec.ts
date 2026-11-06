import {importTokenKey, seal, unseal} from "./tokenCrypto";

const TEST_KEY_B64 = "A".repeat(43) + "=";
const OTHER_KEY_B64 = "B".repeat(43) + "=";

describe("tokenCrypto", () => {
  describe("importTokenKey", () => {
    it("rejects a missing key", async () => {
      await expect(importTokenKey(undefined)).rejects.toThrow("not set");
      await expect(importTokenKey("")).rejects.toThrow("not set");
    });

    it("rejects a key that is not 32 bytes", async () => {
      await expect(importTokenKey(btoa("short"))).rejects.toThrow("32 bytes");
    });
  });

  describe("seal", () => {
    it("round-trips through unseal", async () => {
      const key = await importTokenKey(TEST_KEY_B64);
      await expect(unseal(key, await seal(key, "tok_123"))).resolves.toBe(
          "tok_123",
      );
    });

    it("does not contain the token and differs every time", async () => {
      const key = await importTokenKey(TEST_KEY_B64);
      const a = await seal(key, "tok_123");
      const b = await seal(key, "tok_123");
      expect(a).not.toContain("tok_123");
      expect(atob(a)).not.toContain("tok_123");
      expect(a).not.toBe(b);
    });
  });

  describe("unseal", () => {
    it("fails under a different key", async () => {
      const key = await importTokenKey(TEST_KEY_B64);
      const other = await importTokenKey(OTHER_KEY_B64);
      await expect(unseal(other, await seal(key, "tok"))).rejects.toThrow();
    });
  });
});
