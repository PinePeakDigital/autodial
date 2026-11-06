import {getMe} from "../../src/lib";
import {removeUser} from "./database";
import doRemove from "./doRemove";

jest.mock("../../src/lib/beeminder");
jest.mock("./database");

const mockGetMe = getMe as jest.Mock;

const kv = {} as KVNamespace;

describe("doRemove", () => {
  beforeEach(() => {
    mockGetMe.mockReset();
    (removeUser as jest.Mock).mockClear();
  });

  it("removes the user Beeminder reports for the token", async () => {
    mockGetMe.mockResolvedValue("the_user");

    await doRemove(kv, "the_token");

    expect(removeUser).toHaveBeenCalledWith(kv, "the_user");
  });

  it("removes nothing when Beeminder rejects the token", async () => {
    mockGetMe.mockRejectedValue(new Error("mock error"));

    await expect(doRemove(kv, "the_token")).rejects.toThrow("mock error");
    expect(removeUser).not.toHaveBeenCalled();
  });
});
