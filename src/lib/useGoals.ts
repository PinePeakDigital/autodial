import {useQuery, UseQueryResult} from "@tanstack/react-query";
import {getGoalsVerbose} from "./beeminder";
import {now} from "./time";
import {SID} from "./constants";
import {Goal, GoalVerbose} from "./types";
import {getSettings} from "./getSettings";
import useParams from "./useParams";

type Goals = GoalVerbose[]
type GoalsError = Error

export default function useGoals(): UseQueryResult<Goals, GoalsError> {
  const {user, token} = useParams();
  return useQuery({queryKey: ["goals"], queryFn: async () => {
    if (!user || !token) return;
    const goals = await getGoalsVerbose(
        user,
        token,
        now() - (SID * 31),
    );
    goals.sort(function(a: Goal, b: Goal) {
      return a.slug.localeCompare(b.slug);
    });
    return goals.filter((g: Goal) => getSettings(g).autodial);
  }});
}
