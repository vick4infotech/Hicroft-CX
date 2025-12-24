import { requireMe } from "../../components/shared/authServer";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  await requireMe(); // enforce auth, but keep display chrome minimal
  return <>{children}</>;
}
