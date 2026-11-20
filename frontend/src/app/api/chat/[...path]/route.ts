import { forwardToApi } from "@/lib/forward";

// Nemanja chat (/solutions): start, poll, send. Forwarded with the visitor's IP
// (used for rate limiting); see src/lib/forward.ts.
async function forward(request: Request, ctx: RouteContext<"/api/chat/[...path]">) {
  const { path } = await ctx.params;
  if (!path.every((p) => /^[\w-]+$/.test(p))) return Response.json({ detail: "Not found" }, { status: 404 });
  const query = new URL(request.url).search;
  return forwardToApi(request, `/api/chat/${path.join("/")}${query}`);
}

export const GET = forward;
export const POST = forward;
