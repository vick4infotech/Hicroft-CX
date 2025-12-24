"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/**
 * useSocket:
 * - cookie-based auth (access_token cookie)
 * - reconnect handled by socket.io internally
 */
export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const base = useMemo(() => {
    // Socket.IO expects the backend origin (not /api). We'll derive it.
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    return api.replace(/\/api$/, "");
  }, []);

  useEffect(() => {
    const s = io(base, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
    });

    socketRef.current = s;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.disconnect();
    };
  }, [base]);

  return { socket: socketRef.current, connected };
}
