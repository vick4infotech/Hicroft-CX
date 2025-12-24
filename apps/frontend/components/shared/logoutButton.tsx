"use client";

import { apiFetch } from "./api";
import { Button } from "./ui";

export default function LogoutButton() {
  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <Button onClick={logout} className="w-full bg-zinc-800 hover:bg-zinc-700">
      Logout
    </Button>
  );
}
