"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../components/shared/api";
import type { Queue, Ticket } from "../../../components/shared/types";
import { Button, Card, Input, Select } from "../../../components/shared/ui";
import { useSocket } from "../../../components/shared/useSocket";

/**
 * HiPlayer:
 * - full-screen display for a queue
 * - can "activate" via screen code (optional convenience)
 * - listens to queue.snapshot events for instant updates
 */
export default function HiPlayer() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queueId, setQueueId] = useState("");
  const [screenCode, setScreenCode] = useState("");
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
  const next = snapshot?.next ?? [];

  // Minimal "media" rotation (no external dependencies). In a real product,
  // this would be a playlist pulled from the backend.
  const mediaMessages = ["Welcome", "Please have your ticket ready", "Thank you for visiting Hicroft"]; 
  const [mediaIndex, setMediaIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMediaIndex((i) => (i + 1) % mediaMessages.length), 6000);
    return () => clearInterval(t);
  }, []);

  async function activate() {
    setError(null);
    const res = await apiFetch<{ screen: { queueId?: string | null } }>("/screens/activate", {
      method: "POST",
      body: JSON.stringify({ activationCode: screenCode.trim().toUpperCase() }),
    });
    const qid = res.screen.queueId;
    if (qid) setQueueId(qid);
    else setError("Screen has no assigned queue (assign it in HiQueue > Screens)");
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-zinc-950 text-zinc-100 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Hicroft" width={44} height={44} priority />
          <div>
            <div className="text-xl font-semibold">HiPlayer</div>
            <div className="text-sm text-zinc-400">{queueName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <Select value={queueId} onChange={setQueueId} className="min-w-[240px]">
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Input value={screenCode} onChange={setScreenCode} placeholder="Screen code" className="w-[160px]" />
            <Button onClick={activate} className="bg-zinc-800 hover:bg-zinc-700">
              Activate
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <div className="text-sm text-zinc-400">Now Serving</div>
          <div className="mt-3 text-6xl md:text-7xl font-extrabold tracking-tight">
            {current ? `#${current.number}` : "—"}
          </div>
          <div className="mt-3 text-xl text-zinc-300">
            {current?.counterNumber ? `Counter ${current.counterNumber}` : "Waiting to be called"}
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <Card title="Next tickets">
              <div className="space-y-2">
                {next.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="text-lg font-semibold">#{t.number}</div>
                    <div className="text-xs text-zinc-500">WAITING</div>
                  </div>
                ))}
                {next.length === 0 ? <div className="text-sm text-zinc-500">No waiting tickets.</div> : null}
              </div>
            </Card>

            <Card title="Media">
              <div className="h-[180px] rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center text-center text-sm text-zinc-300 px-4">
                {mediaMessages[mediaIndex]}
              </div>
            </Card>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <div className="text-sm text-zinc-400">Connection</div>
          <div className="mt-2 text-sm">
            Status:{" "}
            <span className={connected ? "text-teal-300" : "text-zinc-500"}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="mt-6 text-sm text-zinc-400">Tips</div>
          <ul className="mt-2 space-y-2 text-sm text-zinc-300">
            <li>Use a dedicated display account (e.g. Agent) for kiosk screens.</li>
            <li>Register screens in HiQueue → Screens and activate by code.</li>
            <li>Run in browser full-screen mode for signage.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
