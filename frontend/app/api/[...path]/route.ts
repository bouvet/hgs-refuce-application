import { NextRequest, NextResponse } from "next/server";
import { getServerSession, getBackendUserId } from "@/lib/server-session";
import { userIdentityHeaders } from "@/lib/server-api";

export const dynamic = "force-dynamic";

/**
 * Authenticated reverse-proxy to the FastAPI backend.
 *
 * Forwards every request from the browser to BACKEND_API_URL after attaching
 * a signed identity header. The browser is no longer trusted to send
 * `X-User-Id` — that header is unconditionally stripped from the incoming
 * request and re-injected from the verified Better Auth session.
 *
 * Public exception: `/api/auth/*` is handled by Better Auth's own route
 * handler at `app/api/auth/[...all]/route.ts` — Next.js dispatches the more
 * specific dynamic segment first, so this catch-all never sees those paths.
 */
const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";

const BLOCKED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "x-user-id",
  "x-user-sig",
  "x-user-sig-timestamp",
  "x-user-sig-version",
  "x-service-sig",
  "x-service-sig-timestamp",
  "x-service-sig-version",
]);

const BLOCKED_RESPONSE_HEADERS = new Set([
  "connection",
  "transfer-encoding",
  "content-encoding",
]);

type Params = { path: string[] };

async function handler(
  req: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const backendUserId = getBackendUserId(session.user);
  if (!backendUserId) {
    // SSO user that hasn't been resolved against the backend yet — refuse
    // rather than silently proxy as an anonymous request.
    return NextResponse.json(
      { detail: "User not provisioned in backend" },
      { status: 403 },
    );
  }

  const { path } = await params;
  const backendUrl = new URL(
    "/" + path.join("/"),
    BACKEND_URL.includes("://") ? BACKEND_URL : req.nextUrl,
  );
  req.nextUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  for (const [k, v] of Object.entries(userIdentityHeaders(backendUserId))) {
    headers.set(k, v);
  }

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(backendUrl.toString(), {
    method: req.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!BLOCKED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
