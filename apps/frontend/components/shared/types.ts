export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "AGENT";

export type Me = {
  userId: string;
  email: string;
  role: Role;
  orgId: string | null;
  name: string;
};

export type Queue = {
  id: string;
  name: string;
  services: { id: string; name: string }[];
};

export type TicketStatus = "WAITING" | "CALLED" | "SERVING" | "COMPLETED" | "NO_SHOW";

export type Ticket = {
  id: string;
  queueId: string;
  number: number;
  status: TicketStatus;
  counterNumber?: string | null;
  agentId?: string | null;
  createdAt: string;
  calledAt?: string | null;
  servingAt?: string | null;
  completedAt?: string | null;
};
