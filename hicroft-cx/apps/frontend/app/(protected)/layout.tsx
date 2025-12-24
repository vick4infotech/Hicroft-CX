import { requireMe } from "../../components/shared/authServer";
import { Divider, NavLink, SidebarLogo } from "../../components/shared/ui";
import LogoutButton from "../../components/shared/logoutButton";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();

  const canAnalytics = me.role === "ADMIN" || me.role === "MANAGER";
  const canQueueConfig = me.role === "ADMIN";
  const canScreens = me.role === "ADMIN";
  const canAgent = me.role === "AGENT";

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-r border-zinc-900 bg-zinc-950">
        <SidebarLogo />
        <div className="px-2">
          <div className="px-3 py-2 text-xs text-zinc-500">Apps</div>
          <NavLink href="/hiqueue" label="HiQueue" />
          <NavLink href="/hiplayer" label="HiPlayer" />
          {canAnalytics ? <NavLink href="/hidata" label="HiData" /> : null}
          <Divider />
          <div className="px-3 py-2 text-xs text-zinc-500">HiQueue</div>
          <NavLink href="/hiqueue" label="Overview" />
          {canQueueConfig ? <NavLink href="/hiqueue/queues" label="Queues & Services" /> : null}
          <NavLink href="/hiqueue/tickets" label="Tickets" />
          {canAgent ? <NavLink href="/hiqueue/agent" label="Agent Console" /> : null}
          {canScreens ? <NavLink href="/hiqueue/screens" label="Screens" /> : null}
          <Divider />
          <div className="px-3 py-2 text-xs text-zinc-500">Account</div>
          <div className="px-3 py-1 text-xs text-zinc-400">{me.name}</div>
          <div className="px-3 pb-2 text-xs text-zinc-600">{me.email}</div>
          <div className="px-3 pb-4"><LogoutButton /></div>
        </div>
      </aside>

      <main className="p-6">{children}</main>
    </div>
  );
}
