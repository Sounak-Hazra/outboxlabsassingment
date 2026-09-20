"use client";

import { useRouter } from "next/navigation";

import { clearStoredToken, type AuthenticatedUser } from "@/lib/auth";

type DashboardHeaderProps = { user: AuthenticatedUser };

const initials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();

  const logout = () => {
    clearStoredToken();
    router.replace("/");
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm">ES</div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-950">Email Scheduler</p>
            <p className="text-xs text-slate-500">Campaign operations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="max-w-52 truncate text-xs text-slate-500">{user.email}</p>
          </div>
          {user.avatarUrl ? (
            <div
              aria-label={`${user.name}'s profile avatar`}
              className="size-10 rounded-full bg-cover bg-center ring-2 ring-white shadow-sm"
              role="img"
              style={{ backgroundImage: `url("${user.avatarUrl}")` }}
            />
          ) : (
            <div className="grid size-10 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-2 ring-white shadow-sm">
              {initials(user.name)}
            </div>
          )}
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" onClick={logout} type="button">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
