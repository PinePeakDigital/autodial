import {getUser} from "../../src/lib";
import {removeUser} from "./database";

export default async function doRemove(
    kv: KVNamespace,
    user: string,
    token: string
): Promise<void> {
  await getUser(user, token);
  await removeUser(kv, user);
}
