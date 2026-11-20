import { forwardToApi } from "@/lib/forward";

// Page views from <VisitTracker /> (see src/lib/forward.ts for why this isn't a rewrite).
export async function POST(request: Request) {
  return forwardToApi(request, "/api/track");
}
