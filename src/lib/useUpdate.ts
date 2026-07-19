import {useMutation, UseMutationResult} from "react-query";
import {update} from "./functions";

type UpdateProps = { user: string, token: string };
type ReturnType = UseMutationResult<
  void, {message: string}, UpdateProps>;

export default function useUpdate(): ReturnType {
  return useMutation(
      "update",
      ({user, token}: UpdateProps) => update(user, token),
  );
}
