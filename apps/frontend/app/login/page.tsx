"use client";

import Image from "next/image";
import { useState } from "react";
import { apiFetch } from "../../components/shared/api";
import { Button, Input, Card } from "../../components/shared/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@hicroft.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      window.location.href = "/hiqueue";
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Image src="/logo.png" alt="Hicroft" width={44} height={44} priority />
          <div>
            <div className="text-lg font-semibold">Hicroft CX</div>
            <div className="text-sm text-zinc-400">Sign in to continue</div>
          </div>
        </div>

        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <div className="mb-1 text-xs text-zinc-400">Email</div>
              <Input value={email} onChange={setEmail} placeholder="you@company.com" />
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-400">Password</div>
              <Input value={password} onChange={setPassword} type="password" placeholder="••••••••" />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="text-xs text-zinc-500">
              Seeded accounts use password <span className="text-zinc-300">Password123!</span>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
