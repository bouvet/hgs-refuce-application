import { NextRequest, NextResponse } from "next/server";

//Set BACKEND_API_URL to localhost port in env.local to run local backend
//otherwise it will run NEXT_PUBLIC_API_URL that is set to azure backend url
const BACKEND_URL =
  process.env.BACKEND_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

type Params = { path: string[] };

async function handler(
  req: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
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
    if (!["host", "connection"].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(backendUrl.toString(), {
    method: req.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!["connection", "transfer-encoding"].includes(key.toLowerCase())) {
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
