import useParams from "./useParams";

export default function useIsAuthenticated(): boolean {
  const {user, token} = useParams();
  return !!user && !!token;
}
