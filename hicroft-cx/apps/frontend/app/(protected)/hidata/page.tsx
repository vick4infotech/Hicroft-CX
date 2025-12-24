"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../components/shared/api";
import type { Queue } from "../../../components/shared/types";
import { Card, Select } from "../../../components/shared/ui";
import { useSocket } from "../../../components/shared/useSocket";

/**
 * Tiny SVG bar chart to avoid heavyweight chart libs.
 */
function BarChart({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / Math.max(1, data.length);

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full h-[140px]">
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 20);
        return (
          <g key={d.label}>
            <rect x={i * barW + 1} y={height - h - 16} width={barW - 2} height={h} rx="2" fill="#14b8a6" />
            <text x={i * barW + barW / 2} y={height - 4} textAnchor="middle" fontSize="6">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function HiData() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueId, setQueueId] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { socket, connected } = useSocket();

  async function loadQueues() {
    const data = await apiFetch<Queue[]>("/queues", { method: "GET" });
    setQueues(data);
    if (!queueId && data[0]) setQueueId(data[0].id);
  }

  async function loadOverview(qid: string) {
    const data = await apiFetch<any>(`/analytics/overview?queueId=${encodeURIComponent(qid)}`, { method: "GET" });
    setOverview(data);
  }

  useEffect(() => {
    loadQueues().catch((e) => setError(String(e.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!queueId) return;
    loadOverview(queueId).catch((e) => setError(String(e.message || e)));
  }, [queueId]);

  // Live refresh on queue snapshots (cheap and good enough for MVP).
  useEffect(() => {
    if (!socket || !connected || !queueId) return;
    socket.emit("subscribe.queue", { queueId });

    const onSnapshot = (snap: any) => {
      if (snap.queueId !== queueId) return;
      loadOverview(queueId).catch(() => {});
    };
    socket.on("queue.snapshot", onSnapshot);
    return () => {
      socket.off("queue.snapshot", onSnapshot);
    };
  }, [socket, connected, queueId]);

  const queueName = useMemo(() => queues.find((q) => q.id === queueId)?.name ?? "Queue", [queues, queueId]);

  const peak = (overview?.peakHours ?? []).map((p: any) => ({
    label: String(p.hour),
    value: p.count,
  }));

  const served = (overview?.servedPerAgent ?? []).slice(0, 8);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">HiData</div>
        <div className="text-sm text-zinc-400">Queue analytics dashboard (simple MVP aggregations).</div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      <Card title="Queue">
        <Select value={queueId} onChange={setQueueId}>
          {queues.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </Select>
        <div className="mt-2 text-xs text-zinc-500">Realtime: {connected ? "connected" : "disconnected"}</div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Avg wait time">
          <div className="text-3xl font-bold">
            {overview ? `${Math.round(overview.avgWaitSec)}s` : "—"}
          </div>
          <div className="text-xs text-zinc-500">Avg (calledAt - createdAt) for called tickets.</div>
        </Card>

        <Card title="Top agents">
          <div className="space-y-2">
            {served.length ? (
              served.map((s: any) => (
                <div key={s.agentId} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-sm">{s.agentName}</div>
                  <div className="text-sm font-semibold">{s.count}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">No completed tickets yet.</div>
            )}
          </div>
        </Card>

        <Card title="Peak hours (last 7d calls)">
          {overview ? <BarChart data={peak} /> : <div className="text-sm text-zinc-500">Select a queue.</div>}
          <div className="text-xs text-zinc-500 mt-1">Hour of day (0-23) by count of CALLED events.</div>
        </Card>
      </div>

      <Card title={`Queue: ${queueName}`}>
        <div className="text-sm text-zinc-400">
          This MVP analytics is intentionally simple and sourced from ticket events & timestamps.
        </div>
      </Card>
    </div>
  );
}
