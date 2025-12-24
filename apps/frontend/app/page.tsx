import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Root route: show the login screen first.
 * We only redirect to the app if an access cookie exists.
 * This avoids a blank 500 page when the backend isn't up yet.
 */
export default function Home() {
  const hasAccess = Boolean(cookies().get("hicroft_access")?.value);
  redirect(hasAccess ? "/hiqueue" : "/login");
}
