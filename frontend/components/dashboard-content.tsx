"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock3, ChevronDown, LoaderCircle, MessageSquare, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { EmailActivity, type EmailTab } from "@/components/email-activity";
import { clearStoredToken, fetchAuthenticatedUser, fetchSlackConnectionStatus, getSlackAuthorizationUrl, getStoredToken, storeToken, type AuthenticatedUser } from "@/lib/auth";

const initials = (name: string): string => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

export function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [activeTab, setActiveTab] = useState<EmailTab>("sent");
  const [counts, setCounts] = useState({ scheduled: 0, sent: 0 });
  const [slackConnected, setSlackConnected] = useState(false);
  const [isConnectingSlack, setIsConnectingSlack] = useState(false);
  const [slackError, setSlackError] = useState<string | null>(null);

  useEffect(() => {
    const establishSession = async () => {
      const callbackToken = searchParams.get("token");
      if (callbackToken) storeToken(callbackToken);
      const token = callbackToken ?? getStoredToken();
      if (!token) return router.replace("/");

      const authenticatedUser = await fetchAuthenticatedUser(token);
      if (!authenticatedUser) return router.replace("/");
      setUser(authenticatedUser);
      void fetchSlackConnectionStatus(token).then(setSlackConnected).catch(() => undefined);

      if (callbackToken || searchParams.get("slack") || searchParams.get("success") || searchParams.get("error")) router.replace("/dashboard");
    };
    void establishSession();
  }, [router, searchParams]);

  const updateCounts = useCallback((nextCounts: { scheduled: number; sent: number }) => setCounts(nextCounts), []);

  const connectSlack = async () => {
    const token = getStoredToken();
    if (!token) return router.replace("/");

    setSlackError(null);
    setIsConnectingSlack(true);
    try {
      window.location.assign(await getSlackAuthorizationUrl(token));
    } catch (error) {
      setSlackError(error instanceof Error ? error.message : "Unable to connect Slack.");
      setIsConnectingSlack(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    router.replace("/");
  };

  if (!user) return <main className="grid min-h-screen place-items-center bg-white"><LoaderCircle className="size-7 animate-spin text-emerald-600" /></main>;

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 sticky top-0 left-0 h-screen shrink-0 flex-col border-r border-slate-100 px-5 py-4 sm:flex">
          <div className="font-mono text-3xl font-black leading-none tracking-[-0.18em] text-black">OMG</div>
          <button className="mt-4 flex w-full items-center gap-2 rounded-xl bg-slate-50 px-2 py-2 text-left" type="button">
            {user.avatarUrl ? <span aria-label={`${user.name}'s avatar`} className="size-7 rounded-full bg-cover bg-center" role="img" style={{ backgroundImage: `url("${user.avatarUrl}")` }} /> : <span className="grid size-7 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">{initials(user.name)}</span>}
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium text-slate-800">{user.name}</span><span className="block truncate text-[9px] text-slate-400">{user.email}</span></span><ChevronDown className="size-3.5 text-slate-400" />
          </button>
          <Link className="mt-3 block w-full rounded-xl border border-emerald-500 py-2 text-center text-[11px] font-semibold text-emerald-600" href="/dashboard/compose">Compose</Link>
          <p className="mt-8 px-1 text-[9px] font-medium uppercase tracking-wider text-slate-400">Core</p>
          <nav className="mt-2 space-y-1" aria-label="Email folders">
            <button className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] transition ${activeTab === "scheduled" ? "bg-emerald-50 text-slate-700" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setActiveTab("scheduled")} type="button"><Clock3 className="size-3.5" /> <span className="flex-1">Scheduled</span><span className="text-[10px] text-slate-500">{counts.scheduled}</span></button>
            <button className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] transition ${activeTab === "sent" ? "bg-emerald-50 text-slate-700" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setActiveTab("sent")} type="button"><Send className="size-3.5" /> <span className="flex-1">Sent</span><span className="text-[10px] text-slate-500">{counts.sent}</span></button>
          </nav>
          <div className="mt-auto border-t border-slate-100 pt-4">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={isConnectingSlack || slackConnected} onClick={connectSlack} type="button"><MessageSquare className="size-3.5 text-[#4A154B]" /> {slackConnected ? "Slack connected" : isConnectingSlack ? "Connecting Slack…" : "Connect Slack"}</button>
            {slackError && <p className="mt-2 text-center text-[10px] leading-4 text-red-600">{slackError}</p>}
            <button className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50" onClick={logout} type="button">Logout</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1"><EmailActivity activeTab={activeTab} onCountsChange={updateCounts} /></main>
      </div>
    </div>
  );
}
