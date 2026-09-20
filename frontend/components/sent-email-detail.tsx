"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, LoaderCircle } from "lucide-react";

import { fetchAuthenticatedUser, fetchSentEmailDetail, getStoredToken, type AuthenticatedUser, type SentEmailDetail } from "@/lib/auth";

type SentEmailDetailProps = { emailId: string };

const formatDate = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) 
    ? "" 
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" }).format(date);
};

export function SentEmailDetail({ emailId }: SentEmailDetailProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [email, setEmail] = useState<SentEmailDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmail = async () => {
      const token = getStoredToken();
      if (!token) return router.replace("/");

      const authenticatedUser = await fetchAuthenticatedUser(token);
      if (!authenticatedUser) return router.replace("/");
      setUser(authenticatedUser);

      try {
        setEmail(await fetchSentEmailDetail(emailId, token));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load this sent email.");
      }
    };

    void loadEmail();
  }, [emailId, router]);

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-white">
        <LoaderCircle className="size-8 animate-spin text-gray-400" />
      </main>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <button onClick={() => router.back()} className="text-gray-500 mb-6 flex items-center gap-2">
          <ArrowLeft className="size-5" /> Back
        </button>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!email) {
    return (
      <main className="grid min-h-screen place-items-center bg-white">
        <LoaderCircle className="size-8 animate-spin text-gray-400" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <main className="mx-auto max-w-5xl px-6 py-6">
        
        {/* Top Header Row */}
        <div className="flex items-center gap-4 pb-6">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 transition">
            <ArrowLeft className="size-[1.15rem]" strokeWidth={1.5} />
          </button>
          <h1 className="text-[1.35rem] font-normal text-gray-900">{email.subject}</h1>
        </div>

        {/* Email Header */}
        <div className="flex justify-between items-start mt-4 ml-10">
          <div className="flex gap-4">
            {/* Sender Avatar */}
            <div className="size-10 rounded-full bg-[#10b981] text-white flex items-center justify-center font-medium text-sm shrink-0">
              {/* Dummy initial to match UI since sender name isn't in the DB payload */}
              A
            </div>
            
            <div className="pt-0.5">
              <div className="flex items-center gap-2">
                {/* Dummy name to match UI */}
                <span className="font-semibold text-gray-900 text-sm">Amanda Clark</span>
                <span className="text-gray-500 text-sm">&lt;{email.recipientEmail}&gt;</span>
              </div>
              <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                to me <ChevronDown className="size-3 text-gray-400" strokeWidth={2} />
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 pt-1">
            {formatDate(email.sentAt || email.scheduledTime)}
          </div>
        </div>

        {/* Email Body */}
        <div className="mt-8 ml-[4.5rem] mr-8 whitespace-pre-wrap text-[15px] text-gray-800 leading-relaxed">
          {email.body}
        </div>

      </main>
    </div>
  );
}