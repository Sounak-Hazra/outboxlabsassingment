"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { 
  ArrowLeft, Paperclip, Clock, UploadCloud, Undo, Redo, 
  Type, Bold, Italic, Underline, AlignLeft, ChevronsUpDown, 
  List, ListOrdered, IndentDecrease, IndentIncrease, Quote, 
  Code, Link as LinkIcon 
} from "lucide-react";

import { getBackendApiUrl, getStoredToken } from "@/lib/auth";

type Toast = { kind: "success" | "error"; message: string } | null;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ComposeEmail() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [body, setBody] = useState("");
  const [delaySeconds, setDelaySeconds] = useState("");
  const [hourlyLimit, setHourlyLimit] = useState("");
  const [startTime, setStartTime] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!getStoredToken()) router.replace("/");
  }, [router]);

  const showToast = (nextToast: Exclude<Toast, null>) => {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 5_000);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? []);
    if (!file) return;

    Papa.parse<string[]>(file, {
      skipEmptyLines: "greedy",
      complete: (results) => {
        const uniqueEmails = [...new Set(
          results.data.flat().map((v) => v.trim().toLowerCase()).filter((v) => emailPattern.test(v))
        )];
        setEmails(uniqueEmails);
        if (uniqueEmails.length === 0) showToast({ kind: "error", message: "No valid emails found." });
      }
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const token = getStoredToken();
    if (!token || emails.length === 0 || !subject || !from) return;

    setIsSubmitting(true);
    const scheduledDate = startTime ? new Date(startTime) : new Date();
    
    const leadsFile = new File([`email\n${emails.join("\n")}\n`], "leads.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.append("leads", leadsFile);
    formData.append("from", from.trim());
    formData.append("subject", subject.trim());
    formData.append("body", body.trim());
    formData.append("start_time", scheduledDate.toISOString());
    formData.append("delay_ms", String(Number(delaySeconds || 0) * 1_000));
    formData.append("hourly_limit", String(Number(hourlyLimit || 0)));

    try {
      const response = await fetch(getBackendApiUrl("/campaigns/schedule"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to schedule.");
      showToast({ kind: "success", message: "Campaign scheduled!" });
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      showToast({ kind: "error", message: "Unable to schedule this campaign." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      <form onSubmit={submit} className="mx-auto max-w-5xl px-6 py-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-xl font-semibold">Compose New Email</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative text-green-600">
              <Paperclip className="size-5" />
              <span className="absolute -bottom-1 -right-2 flex size-3 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">1</span>
            </div>
            
            {/* The hidden date picker */}
            <input 
              ref={timeInputRef}
              type="datetime-local" 
              className="sr-only"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <button 
              type="button"
              onClick={() => {
                // @ts-ignore - showPicker is supported in modern browsers but sometimes misses TS types
                timeInputRef.current?.showPicker?.();
              }}
              className="flex items-center gap-2 cursor-pointer transition hover:opacity-70"
            >
              <Clock className="size-5 text-green-600" />
              {startTime && (
                <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  {new Date(startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="rounded-full border border-green-500 px-4 py-1.5 text-sm font-medium text-green-600 transition hover:bg-green-50 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Later"}
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="mt-4 space-y-1">
          {/* From */}
          <div className="flex items-center gap-6 py-3 border-b border-gray-100">
            <span className="w-16 text-sm text-gray-500">From</span>
            <input
              required
              type="email"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 text-sm text-gray-800 outline-none placeholder:text-gray-300"
              placeholder="sender@example.com"
            />
          </div>

          {/* To */}
          <div className="flex items-center gap-6 py-3 border-b border-gray-100">
            <span className="w-16 text-sm text-gray-500">To</span>
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              {emails.length === 0 ? (
                <span className="text-sm text-gray-400">No recipients uploaded</span>
              ) : (
                <>
                  {emails.slice(0, 3).map((email) => (
                    <span key={email} className="rounded-full border border-green-500 px-3 py-0.5 text-xs text-green-700 bg-white">
                      {email}
                    </span>
                  ))}
                  {emails.length > 3 && (
                    <span className="rounded-full border border-green-500 px-2 py-0.5 text-xs text-green-700 bg-white">
                      +{emails.length - 3}
                    </span>
                  )}
                </>
              )}
              
              <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
              <button 
                type="button" 
                onClick={() => inputRef.current?.click()} 
                className="ml-auto flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
              >
                <UploadCloud className="size-4" /> Upload List
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-6 py-3 border-b border-gray-100">
            <span className="w-16 text-sm text-gray-500">Subject</span>
            <input 
              required 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              className="flex-1 text-sm text-gray-800 outline-none placeholder:text-gray-300" 
              placeholder="Subject" 
            />
          </div>

          {/* Limits */}
          <div className="flex items-center gap-8 py-3 border-b border-gray-100">
            <label className="flex items-center gap-3 text-sm text-gray-500">
              Delay between 2 emails
              <input 
                required 
                type="number" 
                value={delaySeconds} 
                onChange={(e) => setDelaySeconds(e.target.value)} 
                className="w-16 rounded border border-gray-200 px-2 py-1 text-center text-sm outline-none placeholder:text-gray-300" 
                placeholder="00" 
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-500">
              Hourly Limit
              <input 
                required 
                type="number" 
                value={hourlyLimit} 
                onChange={(e) => setHourlyLimit(e.target.value)} 
                className="w-16 rounded border border-gray-200 px-2 py-1 text-center text-sm outline-none placeholder:text-gray-300" 
                placeholder="00" 
              />
            </label>
          </div>
        </div>

        {/* Editor */}
        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <textarea 
            required 
            value={body} 
            onChange={(e) => setBody(e.target.value)} 
            className="min-h-[250px] w-full resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400" 
            placeholder="Type Your Reply..." 
          />
          
          {/* Fake Rich Text Toolbar */}
          <div className="mt-4 flex items-center gap-4 text-gray-400 border-t border-gray-200 pt-3 overflow-x-auto">
            <Undo className="size-4 hover:text-gray-600 cursor-pointer" />
            <Redo className="size-4 hover:text-gray-600 cursor-pointer" />
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <Type className="size-4 hover:text-gray-600 cursor-pointer" />
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <Bold className="size-4 hover:text-gray-600 cursor-pointer" />
            <Italic className="size-4 hover:text-gray-600 cursor-pointer" />
            <Underline className="size-4 hover:text-gray-600 cursor-pointer" />
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <AlignLeft className="size-4 hover:text-gray-600 cursor-pointer" />
            <ChevronsUpDown className="size-4 hover:text-gray-600 cursor-pointer" />
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <ListOrdered className="size-4 hover:text-gray-600 cursor-pointer" />
            <List className="size-4 hover:text-gray-600 cursor-pointer" />
            <IndentDecrease className="size-4 hover:text-gray-600 cursor-pointer" />
            <IndentIncrease className="size-4 hover:text-gray-600 cursor-pointer" />
            <Quote className="size-4 hover:text-gray-600 cursor-pointer" />
            <Code className="size-4 hover:text-gray-600 cursor-pointer" />
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <LinkIcon className="size-4 hover:text-gray-600 cursor-pointer" />
          </div>
        </div>

      </form>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 rounded px-4 py-2 text-sm text-white shadow ${toast.kind === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
