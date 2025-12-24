import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Me } from "./types";

/**
 * Server-side auth check:
 * - calls backend /auth/me with forwarded cookies
 * - redirects to /login if unauthenticated
 */
export async function requireMe(): Promise<Me> {
  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  let res: Response;
  try {
    res = await fetch(`${base}/auth/me`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
  } catch {
    // Backend not reachable (common first-run issue) => send user to login.
    redirect("/login");
  }

  if (res.status === 401) redirect("/login");
  if (!res.ok) throw new Error("Failed to load user");

  return (await res.json()) as Me;
}
