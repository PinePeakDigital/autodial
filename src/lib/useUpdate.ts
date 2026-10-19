import {useMutation, UseMutationResult} from "@tanstack/react-query";
import {update} from "./functions";

type UpdateProps = { user: string, token: string };
type ReturnType = UseMutationResult<
  void, {message: string}, UpdateProps>;

export default function useUpdate(): ReturnType {
  return useMutation({
    mutationKey: ["update"],
    mutationFn: ({user, token}: UpdateProps) => update(user, token),
  });
}
