"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../../components/shared/api";
import type { Queue } from "../../../../components/shared/types";
import { Button, Card, Input } from "../../../../components/shared/ui";

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [name, setName] = useState("");
  const [serviceName, setServiceName] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const data = await apiFetch<Queue[]>("/queues", { method: "GET" });
    setQueues(data);
  }

  useEffect(() => {
    load().catch((e) => setError(String(e.message || e)));
  }, []);

  async function createQueue() {
    setError(null);
    await apiFetch("/queues", { method: "POST", body: JSON.stringify({ name }) });
    setName("");
    await load();
  }

  async function addService(queueId: string) {
    setError(null);
    const n = serviceName[queueId];
    if (!n) return;
    await apiFetch(`/queues/${queueId}/services`, { method: "POST", body: JSON.stringify({ name: n }) });
    setServiceName((s) => ({ ...s, [queueId]: "" }));
    await load();
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Queues & Services</div>
        <div className="text-sm text-zinc-400">Admin configuration</div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      <Card title="Create Queue">
        <div className="flex gap-2">
          <Input value={name} onChange={setName} placeholder="e.g. Customer Support" />
          <Button onClick={createQueue} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </Card>

      <div className="grid gap-4">
        {queues.map((q) => (
          <Card key={q.id} title={q.name}>
            <div className="text-xs text-zinc-500 mb-2">Services</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {q.services.map((s) => (
                <div key={s.id} className="rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-xs">
                  {s.name}
                </div>
              ))}
              {q.services.length === 0 ? <div className="text-xs text-zinc-600">No services yet</div> : null}
            </div>

            <div className="flex gap-2">
              <Input
                value={serviceName[q.id] || ""}
                onChange={(v) => setServiceName((s) => ({ ...s, [q.id]: v }))}
                placeholder="Add service (e.g. Payments)"
              />
              <Button onClick={() => addService(q.id)} disabled={!(serviceName[q.id] || "").trim()}>
                Add
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
