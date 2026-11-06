import doUpdate from "./doUpdate";
import {getMe} from "../../src/lib";
import {updateUser} from "./database";

jest.mock("../../src/lib/beeminder");
jest.mock("./database");

const mockGetMe = getMe as jest.Mock;

const kv = {} as KVNamespace;
const key = {} as CryptoKey;

describe("doUpdate", () => {
  beforeEach(() => {
    mockGetMe.mockReset();
    (updateUser as jest.Mock).mockClear();
  });

  it("stores the token under the username Beeminder reports", async () => {
    mockGetMe.mockResolvedValue("the_user");

    await doUpdate(kv, key, "the_token");

    expect(getMe).toHaveBeenCalledWith("the_token");
    expect(updateUser).toHaveBeenCalledWith(kv, key, "the_user", "the_token");
  });

  it("stores nothing when Beeminder rejects the token", async () => {
    mockGetMe.mockRejectedValue(new Error("mock error"));

    await expect(doUpdate(kv, key, "the_token")).rejects.toThrow("mock error");
    expect(updateUser).not.toHaveBeenCalled();
  });
});
