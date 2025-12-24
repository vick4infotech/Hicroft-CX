import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin API proxy.
 *
 * Why this exists:
 * - avoids browser CORS issues (localhost vs 127.0.0.1, port drift)
 * - keeps httpOnly cookie auth stable (frontend talks to itself; server forwards)
 *
 * Frontend calls: /api/proxy/<path>
 * This route forwards to BACKEND_API_URL (defaults to http://localhost:4000/api).
 */

function backendBase(): string {
  // NEXT_PUBLIC_API_URL typically contains the backend API base with /api.
  // BACKEND_API_URL allows overriding without exposing a public env.
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api"
  ).replace(/\/$/, "");
}

async function forward(req: NextRequest, params: { path: string[] }) {
  const base = backendBase();
  const joined = params.path.join("/");
  const url = new URL(`${base}/${joined}`);

  // Preserve querystring
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  // Copy request headers, but avoid hop-by-hop headers.
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer();

  const upstream = await fetch(url.toString(), {
    method: req.method,
    headers,
    body,
    // Pass-through cookies in both directions.
    redirect: "manual",
  });

  // Build response, carefully forwarding Set-Cookie headers.
  const resHeaders = new Headers(upstream.headers);
  // Some headers can confuse the browser when proxied.
  resHeaders.delete("content-encoding");
  resHeaders.delete("transfer-encoding");

  const data = await upstream.arrayBuffer();
  const res = new NextResponse(data, {
    status: upstream.status,
    headers: resHeaders,
  });

  // Undici supports getSetCookie() to retrieve multiple cookies.
  const setCookies: string[] = (upstream.headers as any).getSetCookie?.() ?? [];
  for (const c of setCookies) {
    res.headers.append("set-cookie", c);
  }

  return res;
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return forward(req, ctx.params);
}
