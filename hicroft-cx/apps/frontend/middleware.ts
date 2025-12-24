import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight route protection at the edge.
 *
 * Why this exists:
 * - Server Components call the backend to validate sessions.
 * - If a user hits /hiqueue directly without a session cookie,
 *   we can redirect immediately without waiting on any API call.
 *
 * Note:
 * - This does NOT replace server-side validation.
 * - It simply avoids confusing blank pages on first run.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith("/hiqueue") || pathname.startsWith("/hidata") || pathname.startsWith("/hiplayer");
  if (!isProtected) return NextResponse.next();

  const hasAccess = Boolean(req.cookies.get("hicroft_access")?.value);
  if (hasAccess) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/hiqueue/:path*", "/hidata/:path*", "/hiplayer/:path*"],
};
