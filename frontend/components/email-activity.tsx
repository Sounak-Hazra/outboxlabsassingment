"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Funnel, LoaderCircle, RefreshCw, Search, Star, XCircle } from "lucide-react";

import { fetchEmailList, getStoredToken, searchEmails, type EmailRecord } from "@/lib/auth";

export type EmailTab = "scheduled" | "sent";

type EmailActivityProps = {
  activeTab: EmailTab;
  onCountsChange: (counts: { scheduled: number; sent: number }) => void;
};

const preview = (body?: string): string => body?.replace(/\s+/g, " ").trim() || "No message preview available.";

export function EmailActivity({ activeTab, onCountsChange }: EmailActivityProps) {
  const [scheduled, setScheduled] = useState<EmailRecord[]>([]);
  const [sent, setSent] = useState<EmailRecord[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EmailRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    let active = true;
    const loadLists = async () => {
      try {
        const [nextScheduled, nextSent] = await Promise.all([fetchEmailList("scheduled", token), fetchEmailList("sent", token)]);
        if (!active) return;
        setScheduled(nextScheduled);
        setSent(nextSent);
        onCountsChange({ scheduled: nextScheduled.length, sent: nextSent.length });
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load emails.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void loadLists();
    return () => { active = false; };
  }, [onCountsChange]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const token = getStoredToken();
    if (!normalizedQuery || !token) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!active) return;
      setIsSearching(true);
      try {
        const results = await searchEmails(normalizedQuery, token);
        if (active) setSearchResults(results);
      } catch (searchError) {
        if (active) setError(searchError instanceof Error ? searchError.message : "Unable to search emails.");
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  const isSearchMode = Boolean(query.trim());
  const emails = isSearchMode ? searchResults : activeTab === "sent" ? sent : scheduled;
  const visibleEmails = isSearchMode ? emails.filter((email) => activeTab === "sent" ? email.status === "SENT" : email.status !== "SENT") : emails;

  return (
    <section className="min-w-0 flex-1 bg-white">
      <div className="flex h-16 items-center gap-4 border-b border-slate-100 px-5 sm:px-7">
        <label className="relative max-w-[530px] flex-1"><span className="sr-only">Search emails</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="h-8 w-full rounded-full bg-slate-100 pl-9 pr-4 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-200" onChange={(event) => setQuery(event.target.value)} placeholder="Search" type="search" value={query} /></label>
        <button aria-label="Filter emails" className="text-slate-400 transition hover:text-slate-600" type="button"><Funnel className="size-3.5" /></button><button aria-label="Refresh email list" className="text-slate-400 transition hover:text-slate-600" onClick={() => window.location.reload()} type="button"><RefreshCw className="size-3.5" /></button>
      </div>
      {error ? <div className="mx-5 mt-5 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><XCircle className="size-4 shrink-0" />{error}</div> : null}
      {(isLoading || (isSearchMode && isSearching)) ? <div className="grid min-h-44 place-items-center text-sm text-slate-400"><span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" /> Loading emails…</span></div> : visibleEmails.length === 0 ? <div className="px-5 py-10 text-center text-sm text-slate-400">{isSearchMode ? "No matching emails." : `No ${activeTab} emails yet.`}</div> : <div>{visibleEmails.map((email) => {
        const isSent = email.status === "SENT";
        const row = <><div className="min-w-36 shrink-0 text-xs font-medium text-slate-800">To: {email.recipientEmail}</div><div className="min-w-0 flex-1 truncate text-xs"><span className="mr-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">{isSent ? "Sent" : "Scheduled"}</span><span className="font-semibold text-slate-800">{email.subject ?? "Untitled email"}</span><span className="text-slate-400"> — {preview(email.body)}</span></div><Star className="ml-4 size-4 shrink-0 text-slate-300" /></>;
        const className = "flex min-h-11 items-center gap-4 border-b border-slate-100 px-5 py-2 transition hover:bg-slate-50 sm:px-7";
        return isSent ? <Link aria-label={`View sent email to ${email.recipientEmail}`} className={className} href={`/dashboard/emails/${email.id}`} key={email.id}>{row}</Link> : <div className={className} key={email.id}>{row}</div>;
      })}</div>}
    </section>
  );
}
