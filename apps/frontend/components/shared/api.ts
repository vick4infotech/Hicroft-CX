/**
 * Minimal fetch wrapper that:
 * - sends credentials (cookies)
 * - retries once on 401 by calling /auth/refresh
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { retry?: boolean },
): Promise<T> {
  // IMPORTANT:
  // Use a same-origin proxy route to avoid CORS and "Failed to fetch" issues
  // when frontend/back end ports differ or Windows resolves localhost
  // differently (127.0.0.1 vs localhost).
  const base = "/api/proxy";

  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401 && init?.retry !== false) {
    // Attempt refresh then retry once.
    await fetch(`${base}/auth/refresh`, { method: "POST", credentials: "include" });
    return apiFetch<T>(path, { ...init, retry: false });
  }

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed (${res.status})`);
  }

  // 204 no content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}
