import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";

export function Button({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 font-medium",
        "bg-teal-600 hover:bg-teal-500 disabled:opacity-50",
        "transition-colors",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className={[
        "w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2",
        "focus:outline-none focus:ring-2 focus:ring-teal-600",
        className,
      ].join(" ")}
    />
  );
}

export function Select({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        "w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2",
        "focus:outline-none focus:ring-2 focus:ring-teal-600",
        className,
      ].join(" ")}
    >
      {children}
    </select>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm">
      {title ? <div className="mb-3 text-sm font-semibold text-zinc-200">{title}</div> : null}
      {children}
    </div>
  );
}

export function SidebarLogo() {
  return (
    <div className="flex items-center gap-3 px-3 py-4">
      <Image src="/logo.png" alt="Hicroft" width={36} height={36} priority />
      <div className="leading-tight">
        <div className="text-sm font-semibold">Hicroft</div>
        <div className="text-xs text-zinc-400">CX App</div>
      </div>
    </div>
  );
}

export function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
    >
      {label}
    </Link>
  );
}

export function Divider() {
  return <div className="my-3 h-px bg-zinc-800" />;
}
