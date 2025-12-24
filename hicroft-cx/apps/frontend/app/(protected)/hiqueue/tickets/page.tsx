"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../components/shared/api";
import type { Queue, Ticket } from "../../../../components/shared/types";
import { Button, Card, Select } from "../../../../components/shared/ui";
import { useSocket } from "../../../../components/shared/useSocket";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    WAITING: "bg-zinc-900 border-zinc-800",
    CALLED: "bg-teal-950/40 border-teal-800/60",
    SERVING: "bg-blue-950/40 border-blue-800/60",
    COMPLETED: "bg-zinc-950/40 border-zinc-800/60",
    NO_SHOW: "bg-red-950/40 border-red-800/60",
  };
  return map[status] ?? "bg-zinc-900 border-zinc-800";
}

export default function TicketsPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueId, setQueueId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { socket, connected } = useSocket();

  async function loadQueues() {
    const data = await apiFetch<Queue[]>("/queues", { method: "GET" });
    setQueues(data);
    if (!queueId && data[0]) setQueueId(data[0].id);
  }

  async function loadTickets(qid: string) {
    const data = await apiFetch<{ tickets: Ticket[] }>(`/tickets?queueId=${encodeURIComponent(qid)}`, { method: "GET" });
    setTickets(data.tickets);
  }

  useEffect(() => {
    loadQueues().catch((e) => setError(String(e.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!queueId) return;
    const q = queues.find((x) => x.id === queueId);
    setServiceId(q?.services?.[0]?.id || "");
    loadTickets(queueId).catch((e) => setError(String(e.message || e)));
  }, [queueId, queues]);

  useEffect(() => {
    if (!socket || !connected || !queueId) return;

    socket.emit("subscribe.queue", { queueId });

    const onSnapshot = (snap: any) => {
      if (snap.queueId === queueId) loadTickets(queueId).catch(() => {});
    };

    socket.on("queue.snapshot", onSnapshot);
    socket.on("ticket.called", onSnapshot);
    socket.on("ticket.completed", onSnapshot);
    socket.on("ticket.serving", onSnapshot);
    socket.on("ticket.no_show", onSnapshot);

    return () => {
      socket.off("queue.snapshot", onSnapshot);
      socket.off("ticket.called", onSnapshot);
      socket.off("ticket.completed", onSnapshot);
      socket.off("ticket.serving", onSnapshot);
      socket.off("ticket.no_show", onSnapshot);
    };
  }, [socket, connected, queueId]);

  const services = useMemo(() => queues.find((q) => q.id === queueId)?.services || [], [queues, queueId]);

  async function createTicket() {
    setError(null);
    await apiFetch("/tickets", { method: "POST", body: JSON.stringify({ queueId, serviceId: serviceId || undefined }) });
    await loadTickets(queueId);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Tickets</div>
        <div className="text-sm text-zinc-400">Generate tickets and watch lifecycle updates.</div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      <Card title="Generate Ticket">
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
            <div className="mb-1 text-xs text-zinc-400">Service (optional)</div>
            <Select value={serviceId} onChange={setServiceId}>
              <option value="">Any</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={createTicket} className="w-full">
              Generate
            </Button>
          </div>
        </div>
      </Card>

      <Card title={`Latest tickets (${tickets.length})`}>
        <div className="space-y-2">
          {tickets.slice().reverse().slice(0, 20).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold">#{t.number}</div>
                <div className={["rounded-full border px-3 py-1 text-xs", statusBadge(t.status)].join(" ")}>
                  {t.status}
                </div>
              </div>
              <div className="text-xs text-zinc-400">
                {t.counterNumber ? `Counter ${t.counterNumber}` : "—"}
              </div>
            </div>
          ))}
          {tickets.length === 0 ? <div className="text-sm text-zinc-500">No tickets yet.</div> : null}
        </div>
      </Card>
    </div>
  );
}
