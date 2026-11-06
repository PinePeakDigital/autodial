import {useMutation, UseMutationResult} from "@tanstack/react-query";
import {remove} from "./functions";
import {clearCredentials} from "./browser";

type RemoveProps = { user: string, token: string };
type ReturnType = UseMutationResult<
  void, {message: string}, RemoveProps>;

export default function useRemove(): ReturnType {
  return useMutation({
    mutationKey: ["remove"],
    mutationFn: ({user, token}: RemoveProps) => remove(user, token),
    onSuccess: clearCredentials,
  });
}
