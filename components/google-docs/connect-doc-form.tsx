"use client";

import { useState } from "react";
import { ExternalLink, Link as LinkIcon } from "lucide-react";
import type { SectionSummary } from "@/lib/parser";
import { ParsedSectionsPreview } from "./parsed-sections-preview";
import { Mascot } from "@/components/shared/mascot";

const MAX_URL_LENGTH = 500;
const GOOGLE_DOCS_URL_PATTERN = /^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/;

interface ConnectedDocument {
  id: string;
  title: string;
  url: string;
  content: string;
  retrievedAt: string;
  truncated: boolean;
  blocks: unknown[];
}

type Status = "idle" | "loading" | "success" | "error";
type ParseStatus = "idle" | "loading" | "success" | "error";

export function ConnectDocForm() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<ConnectedDocument | null>(null);

  const [parseStatus, setParseStatus] = useState<ParseStatus>("idle");
  const [parseError, setParseError] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionSummary[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // A new connection invalidates any previous parse preview.
    setParseStatus("idle");
    setParseError(null);
    setSections(null);

    const trimmed = url.trim();
    if (trimmed.length > MAX_URL_LENGTH || !GOOGLE_DOCS_URL_PATTERN.test(trimmed)) {
      setStatus("error");
      setError("Please enter a valid Google Docs link.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/google-docs/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentUrl: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "I-CARe could not connect to Google Docs right now.");
        return;
      }

      setDoc(data.document);
      setStatus("success");
    } catch {
      setStatus("error");
      setError("I-CARe could not connect to Google Docs right now.");
    }
  }

  async function handlePreviewParsed() {
    if (!doc) return;
    setParseStatus("loading");
    setParseError(null);
    try {
      const res = await fetch("/api/google-docs/parse-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: doc.blocks }),
      });
      const data = await res.json();

      if (!res.ok) {
        setParseStatus("error");
        setParseError(data.error ?? "I-CARe could not parse this document right now.");
        return;
      }

      setSections(data.sections);
      setParseStatus("success");
    } catch {
      setParseStatus("error");
      setParseError("I-CARe could not parse this document right now.");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="paper p-5">
        <label htmlFor="google-doc-url" className="block text-xs font-medium text-foreground mb-1">
          Google Docs URL
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Only Google Docs stored in the approved I-CARe folder can be connected.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <LinkIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="google-doc-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={MAX_URL_LENGTH}
              placeholder="https://docs.google.com/document/d/..."
              className="w-full rounded-xl border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading" || !url.trim()}
            className="rounded-xl bg-primary text-white px-5 py-2 text-sm font-medium hover:-translate-y-0.5 transition-colors disabled:opacity-50 disabled:pointer-events-none flex-shrink-0"
          >
            {status === "loading" ? "Connecting…" : "Connect Document"}
          </button>
        </div>
        {status === "loading" && (
          <p className="text-xs text-muted-foreground mt-2">Connecting to Google Docs…</p>
        )}
        {status === "error" && error && (
          <p className="text-xs text-destructive mt-2">{error}</p>
        )}
      </form>

      {status === "success" && doc && (
        <div className="paper p-5 animate-bounce-in">
          <div className="flex items-start gap-3">
            <Mascot scene="thumbs-up" size="sm" />
            <div className="min-w-0 flex-1">
              <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/15 text-secondary mb-2">
                Google Doc connected
              </span>
              <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last retrieved: {new Date(doc.retrievedAt).toLocaleString()}
              </p>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2 mt-2"
              >
                Open in Google Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handlePreviewParsed}
              disabled={parseStatus === "loading"}
              className="text-xs font-medium px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {parseStatus === "loading" ? "Parsing…" : "Preview Parsed IEP"}
            </button>
            {parseStatus === "error" && parseError && (
              <p className="text-xs text-destructive mt-2">{parseError}</p>
            )}
          </div>
        </div>
      )}

      {parseStatus === "success" && sections && <ParsedSectionsPreview sections={sections} />}
    </div>
  );
}
