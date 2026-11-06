import {getMe} from "../../src/lib";
import {updateUser} from "./database";

export default async function doUpdate(
    kv: KVNamespace,
    key: CryptoKey,
    token: string,
): Promise<void> {
  const user = await getMe(token);
  await updateUser(kv, key, user, token);
}
