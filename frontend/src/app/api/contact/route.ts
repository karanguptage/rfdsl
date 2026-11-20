import { forwardToApi } from "@/lib/forward";

// Contact form (the API rate-limits per visitor IP, so it needs the real address).
export async function POST(request: Request) {
  return forwardToApi(request, "/api/contact");
}
