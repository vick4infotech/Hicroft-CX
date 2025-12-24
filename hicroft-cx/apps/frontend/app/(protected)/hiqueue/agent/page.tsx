"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../components/shared/api";
import type { Queue, Ticket } from "../../../../components/shared/types";
import { Button, Card, Input, Select } from "../../../../components/shared/ui";
import { useSocket } from "../../../../components/shared/useSocket";

export default function AgentConsole() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueId, setQueueId] = useState("");
  const [counterNumber, setCounterNumber] = useState("1");
  const [snapshot, setSnapshot] = useState<{ current: Ticket | null; next: Ticket[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { socket, connected } = useSocket();

  async function loadQueues() {
    const data = await apiFetch<Queue[]>("/queues", { method: "GET" });
    setQueues(data);
    if (!queueId && data[0]) setQueueId(data[0].id);
  }

  useEffect(() => {
    loadQueues().catch((e) => setError(String(e.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket || !connected || !queueId) return;
    socket.emit("subscribe.queue", { queueId });

    const onSnapshot = (snap: any) => {
      if (snap.queueId !== queueId) return;
      setSnapshot({ current: snap.current, next: snap.next });
    };

    socket.on("queue.snapshot", onSnapshot);
    return () => {
      socket.off("queue.snapshot", onSnapshot);
    };
  }, [socket, connected, queueId]);

  const queueName = useMemo(() => queues.find((q) => q.id === queueId)?.name ?? "Queue", [queues, queueId]);
  const current = snapshot?.current ?? null;

  async function callNext() {
    setError(null);
    await apiFetch("/tickets/call-next", { method: "POST", body: JSON.stringify({ queueId, counterNumber }) });
  }

  async function markServing() {
    if (!current) return;
    setError(null);
    await apiFetch(`/tickets/${current.id}/serving`, { method: "POST" });
  }

  async function complete() {
    if (!current) return;
    setError(null);
    await apiFetch(`/tickets/${current.id}/complete`, { method: "POST" });
  }

  async function noShow() {
    if (!current) return;
    setError(null);
    await apiFetch(`/tickets/${current.id}/no-show`, { method: "POST" });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Agent Console</div>
        <div className="text-sm text-zinc-400">Call, serve, complete tickets in real-time.</div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      <Card title="Session">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-zinc-400">Queue</div>
            <Select value={queueId} onChange={setQueueId}>
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-400">Counter</div>
            <Input value={counterNumber} onChange={setCounterNumber} placeholder="e.g. 2" />
          </div>
          <div className="flex items-end">
            <Button onClick={callNext} className="w-full">
              Call Next
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Current (${queueName})`}>
          {current ? (
            <div className="space-y-3">
              <div className="text-3xl font-bold">#{current.number}</div>
              <div className="text-sm text-zinc-400">
                {current.counterNumber ? `Counter ${current.counterNumber}` : "No counter"}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={markServing} className="bg-blue-600 hover:bg-blue-500">
                  Mark Serving
                </Button>
                <Button onClick={complete} className="bg-zinc-800 hover:bg-zinc-700">
                  Complete
                </Button>
                <Button onClick={noShow} className="bg-red-600 hover:bg-red-500">
                  No-show
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">No active ticket. Click “Call Next”.</div>
          )}
        </Card>

        <Card title="Next Up">
          <div className="space-y-2">
            {(snapshot?.next ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-lg font-semibold">#{t.number}</div>
                <div className="text-xs text-zinc-500">WAITING</div>
              </div>
            ))}
            {(snapshot?.next ?? []).length === 0 ? <div className="text-sm text-zinc-500">No waiting tickets.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
