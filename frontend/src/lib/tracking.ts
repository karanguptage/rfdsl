// Browser-side switch that keeps the administrator's own visits out of the
// visitor statistics. Set when signing in to /admin (and changeable on the
// Visitors page); read by <VisitTracker />.
const EXCLUDE_KEY = "rfdsl-exclude-tracking";

export function isTrackingExcluded(): boolean {
  try {
    return localStorage.getItem(EXCLUDE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setTrackingExcluded(excluded: boolean) {
  try {
    if (excluded) localStorage.setItem(EXCLUDE_KEY, "1");
    else localStorage.removeItem(EXCLUDE_KEY);
  } catch {
    /* storage blocked: nothing to remember */
  }
}
