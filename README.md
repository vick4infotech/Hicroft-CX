# Hicroft CX App (MVP)

A modular Customer Experience platform built as a monorepo:

- **HiQueue** – Queue Management System
- **HiPlayer** – Digital Signage / Display App
- **HiData** – Queue Analytics Dashboard

All modules share auth, use role-based access control (RBAC), and receive real-time updates via WebSockets.

## Tech Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, Socket.IO client
- Backend: NestJS, TypeScript, REST + WebSockets, JWT (access+refresh), RBAC, Prisma + PostgreSQL
- Optional: Redis (not required for this MVP)

## Monorepo Layout

```
hicroft-cx/
├── apps/
│   ├── frontend/ (Next.js)
│   │   ├── app/
│   │   └── public/logo.png
│   └── backend/ (NestJS)
├── prisma/
├── docker/
├── .env.example
└── README.md
```

## Quick Start (Local)

### 1) Requirements
- Node.js **20 or 22 (LTS recommended)**
- Docker (for Postgres)

If Prisma commands fail on your machine, switch to Node 20/22 (Prisma can lag behind the newest Node releases).

### 2) Start Postgres
```
cd docker
docker compose up -d
```

### 3) Install deps
From repo root:
```
npm install --workspaces
```

### 4) Configure env
Copy env and edit secrets if needed:
```
cp .env.example .env
```

### 5) Create DB schema + seed users
```
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 6) Run (frontend + backend)
```
npm run dev
```

- Frontend: http://locanlhost:3000
- Backend: http://localhost:4000/api

The app loads at: http://localhost:3000/login

## Default Users (Seeded)

All seeded users use password: **Password123!**

- Super Admin: `superadmin@hicroft.local`
- Admin: `admin@hicroft.local`
- Manager: `manager@hicroft.local`
- Agent: `agent@hicroft.local`

> The seed creates one Organization ("Hicroft Demo Org") and assigns Admin/Manager/Agent to it.

## App Flow (End-to-End)

1. Login
2. HiQueue: Create a Queue + Services
3. HiQueue (Agent): Call next ticket (status changes emit WebSocket events)
4. HiPlayer: Displays current/next tickets instantly
5. HiData: Analytics updates (poll + live events)

## Architecture (Simple Diagram)

```
[Next.js Frontend]
  | REST (cookies/JWT)
  v
[NestJS API] ---- Prisma ----> [PostgreSQL]
  |
  +-- Socket.IO Gateway (JWT via cookie)
        |
        +--> emits queue/ticket events to clients (HiQueue, HiPlayer, HiData)
```

## Notes on Security (MVP)

- Access + refresh JWTs stored as **httpOnly cookies**
- Refresh tokens are **hashed** before being stored
- RBAC enforced on API via guards + decorators
- DTO validation via `class-validator`
- Rate limiting via `@nestjs/throttler`
- CORS restricted to `FRONTEND_URL` and uses credentials

## Common Commands

- `npm run dev` – run frontend + backend
- `npm run prisma:migrate` – apply migrations
- `npm run prisma:seed` – seed default org + users

## Extending

- Add organizations, SLA rules, multi-branch queues, media playlists for HiPlayer, and richer analytics.
