"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../../components/shared/api";
import type { Queue } from "../../../../components/shared/types";
import { Button, Card, Input, Select } from "../../../../components/shared/ui";

type Screen = {
  id: string;
  name: string;
  activationCode: string;
  queueId?: string | null;
  queue?: { id: string; name: string } | null;
};

export default function ScreensPage() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [name, setName] = useState("Lobby Screen");
  const [queueId, setQueueId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [s, q] = await Promise.all([
      apiFetch<{ screens: Screen[] }>("/screens", { method: "GET" }),
      apiFetch<Queue[]>("/queues", { method: "GET" }),
    ]);
    setScreens(s.screens);
    setQueues(q);
    if (!queueId && q[0]) setQueueId(q[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    setError(null);
    await apiFetch("/screens", { method: "POST", body: JSON.stringify({ name, queueId: queueId || undefined }) });
    await load();
  }

  async function assign(screenId: string, qid: string) {
    setError(null);
    await apiFetch(`/screens/${screenId}`, { method: "PATCH", body: JSON.stringify({ queueId: qid || undefined }) });
    await load();
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Screens</div>
        <div className="text-sm text-zinc-400">Register and assign screens used by HiPlayer.</div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      <Card title="Create Screen">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-zinc-400">Name</div>
            <Input value={name} onChange={setName} />
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-400">Assign Queue (optional)</div>
            <Select value={queueId} onChange={setQueueId}>
              <option value="">Unassigned</option>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={create} className="w-full">
              Create
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {screens.map((s) => (
          <Card key={s.id} title={s.name}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <div className="text-zinc-200">
                  Activation Code: <span className="font-mono text-teal-300">{s.activationCode}</span>
                </div>
                <div className="text-xs text-zinc-500">
                  Assigned: {s.queue?.name ?? "Unassigned"} (use this code in HiPlayer)
                </div>
              </div>
              <div className="min-w-[260px]">
                <Select value={s.queueId || ""} onChange={(v) => assign(s.id, v)}>
                  <option value="">Unassigned</option>
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
