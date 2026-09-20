"use client";

import { CheckCircle2, LoaderCircle, MessageSquare, Unplug } from "lucide-react";

type SlackIntegrationProps = {
  connected: boolean;
  isChecking: boolean; 
  
  isWorking: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function SlackIntegration({ connected, isChecking, isWorking, onConnect, onDisconnect }: SlackIntegrationProps) {
  return (
    <section aria-labelledby="integrations-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Integrations</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950" id="integrations-heading">Slack notifications</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Send campaign delivery updates to a Slack channel through an incoming webhook.</p>
        </div>
        {isChecking ? (
          <div aria-live="polite" className="inline-flex items-center gap-2 self-start text-sm font-medium text-slate-500 sm:self-auto">
            <LoaderCircle className="size-4 animate-spin" /> Checking Slack connection…
          </div>
        ) : connected ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> Slack connected</span>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={isWorking} onClick={onDisconnect} type="button">
              {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <Unplug className="size-4" />} Disconnect
            </button>
          </div>
        ) : (
          <button className="inline-flex items-center gap-2 self-start rounded-lg bg-[#4A154B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#611f64] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto" disabled={isWorking} onClick={onConnect} type="button">
            {isWorking ? <LoaderCircle className="size-4 animate-spin" /> : <MessageSquare className="size-4" />} {isWorking ? "Connecting…" : "Connect Slack"}
          </button>
        )}
      </div>
    </section>
  );
}
