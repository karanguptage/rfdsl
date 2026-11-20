import "server-only";

// Forwards a browser request to the Python API with the visitor's real IP.
// Rewrites (next.config.ts) don't pass the client address on, so the routes
// that need it (/api/track, /api/contact) are handled here instead: Next.js
// knows the address (X-Forwarded-For from a proxy in front of it, or the
// connection itself) and sends it to the API, which trusts it from this server.
const API_URL = (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "";
}

export async function forwardToApi(request: Request, path: string): Promise<Response> {
  const isGet = request.method === "GET";
  const body = isGet ? undefined : await request.text();
  if (body && body.length > 64_000) return Response.json({ detail: "Request too large" }, { status: 413 });
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: request.method,
      headers: {
        ...(isGet ? {} : { "content-type": "application/json" }),
        "user-agent": request.headers.get("user-agent") ?? "",
        "x-forwarded-for": clientIp(request),
      },
      body,
      cache: "no-store",
    });
    return new Response(res.status === 204 ? null : await res.text(), {
      status: res.status,
      headers: res.status === 204 ? {} : { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "The service is temporarily unavailable." }, { status: 503 });
  }
}
