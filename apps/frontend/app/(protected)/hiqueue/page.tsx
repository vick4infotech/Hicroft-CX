import { requireMe } from "../../../components/shared/authServer";
import { Card } from "../../../components/shared/ui";

export default async function HiQueueHome() {
  const me = await requireMe();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-semibold">HiQueue</div>
        <div className="text-sm text-zinc-400">Queue management and agent operations.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Role">
          <div className="text-sm text-zinc-200">{me.role}</div>
          <div className="text-xs text-zinc-500">RBAC is enforced in the API.</div>
        </Card>
        <Card title="Realtime">
          <div className="text-sm text-zinc-200">Socket.IO</div>
          <div className="text-xs text-zinc-500">Ticket events update HiPlayer/HiData instantly.</div>
        </Card>
        <Card title="Logo">
          <div className="text-sm text-zinc-200">/public/logo.png</div>
          <div className="text-xs text-zinc-500">Used in sidebar, login, and HiPlayer.</div>
        </Card>
      </div>
    </div>
  );
}
