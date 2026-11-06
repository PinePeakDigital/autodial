import {getMe} from "../../src/lib";
import {removeUser} from "./database";

export default async function doRemove(
    kv: KVNamespace,
    token: string,
): Promise<void> {
  const user = await getMe(token);
  await removeUser(kv, user);
}
