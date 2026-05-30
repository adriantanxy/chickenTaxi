import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { routeToPath } from "./routes";

// Adapter so pages can keep their existing API: onNavigate(ROUTES.X[, params]).
// Maps a route key to its URL and pushes it via react-router.
export function useAppNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (route, params) => navigate(routeToPath(route, params)),
    [navigate]
  );
}
