import {useMutationState} from "@tanstack/react-query";
import {getCredentials} from "./browser";

export default function useParams(): {
  user: string | null,
  token: string | null,
  } {
  // Once the user disables the autodialer, act as signed out.
  const removed = useMutationState({
    filters: {mutationKey: ["remove"], status: "success"},
  }).length > 0;
  return removed ? {user: null, token: null} : getCredentials();
}
