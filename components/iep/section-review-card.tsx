"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SEVERITY_STYLES } from "@/lib/severity-styles";
import { Mascot } from "@/components/shared/mascot";
import type { SectionReviewStatus } from "@/lib/review/section-status";
import type { FlagForReview, SectionForReview } from "./section-review-experience";

const STATUS_STYLES: Record<SectionReviewStatus, { label: string; badge: string }> = {
  pending: { label: "Pending", badge: "bg-cream text-muted-foreground" },
  in_review: { label: "In Review", badge: "bg-care-peach/40 text-[#8A5A28]" },
  completed: { label: "Completed", badge: "bg-care-green-light text-[#3F6B3A]" },
  no_findings: { label: "No Findings", badge: "bg-care-green-light text-[#3F6B3A]" },
  needs_manual_review: { label: "Needs Manual Review", badge: "bg-care-red-light text-[#A8402C]" },
};

interface Props {
  section: SectionForReview;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onDecided: () => void;
}

export function SectionReviewCard({ section, index, total, onPrevious, onNext, onDecided }: Props) {
  const statusStyle = STATUS_STYLES[section.status];

  return (
    <div className="space-y-4">
      <div className="paper p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusStyle.badge}`}>
            {statusStyle.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Section {index + 1} of {total}
        </p>

        <SectionCariNote status={section.status} />

        <div
          className="prose prose-sm max-w-none text-foreground mt-4 pt-4 border-t border-border
            prose-headings:text-foreground prose-headings:font-semibold
            prose-p:leading-relaxed prose-li:leading-relaxed
            prose-table:text-xs prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: section.rawHtml }}
        />
      </div>

      {section.flags.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Suggestions for this section</h3>
          {section.flags.map((flag) => (
            <FlagDecisionCard key={flag.id} flag={flag} onDecided={onDecided} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={index === 0}
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground px-3 py-2 rounded-lg hover:bg-cream transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous Section
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={index === total - 1}
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground px-3 py-2 rounded-lg hover:bg-cream transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          Next Section
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Cari stays secondary — a short, honest line, never claiming to have
// fixed or verified anything itself. Only shown for the three "resting"
// states; pending/in_review show the action list instead, which speaks
// for itself.
function SectionCariNote({ status }: { status: SectionReviewStatus }) {
  if (status === "no_findings") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mascot scene="checklist" size="sm" />
        <span>Cari didn&apos;t find anything that needs your attention in this section.</span>
      </div>
    );
  }
  if (status === "completed") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mascot scene="checklist" size="sm" />
        <span>You&apos;re done reviewing this section.</span>
      </div>
    );
  }
  if (status === "needs_manual_review") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mascot scene="confused" size="sm" />
        <span>This section may benefit from a closer look.</span>
      </div>
    );
  }
  return null;
}

const DECISION_LABEL: Record<string, string> = {
  ACCEPTED: "Accepted for review",
  REJECTED: "Rejected",
  EDITED: "Edited for review",
};

function FlagDecisionCard({ flag, onDecided }: { flag: FlagForReview; onDecided: () => void }) {
  const style = SEVERITY_STYLES[flag.severity];
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(flag.suggestedText ?? "");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "ACCEPTED" | "REJECTED" | "EDITED", editedText?: string) {
    setSubmitting(decision);
    setError(null);
    try {
      const res = await fetch(`/api/flags/${flag.id}/teacher-decide`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedText !== undefined ? { decision, editedText } : { decision }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save your decision.");
      }
      setEditing(false);
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your decision.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className={`border-l-4 ${style.border} bg-card rounded-r-xl border border-l-0 border-border shadow-paper p-4 space-y-2`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
        <span className="text-xs font-medium text-foreground">{flag.category.replace(/_/g, " ")}</span>
      </div>

      {flag.highlightText && (
        <p className="text-xs bg-ivory rounded-lg px-3 py-2 text-muted-foreground font-mono line-clamp-3">
          &ldquo;{flag.highlightText}&rdquo;
        </p>
      )}

      <p className="text-xs text-foreground leading-relaxed">{flag.recommendation}</p>

      {flag.suggestedText && (
        <div className="text-xs bg-care-green-light rounded-lg px-3 py-2 text-[#3F6B3A]">
          <span className="font-semibold">AI suggested: </span>
          {flag.suggestedText}
        </div>
      )}

      {flag.teacherDecision && !editing ? (
        <div className="text-xs bg-primary/10 rounded-lg px-3 py-2 text-primary space-y-1">
          <p className="font-semibold">{DECISION_LABEL[flag.teacherDecision]}</p>
          {flag.teacherDecision === "EDITED" && flag.teacherEditedText && (
            <p className="text-foreground">
              <span className="font-semibold">Your edited version: </span>
              {flag.teacherEditedText}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setDraftText(flag.teacherEditedText ?? flag.suggestedText ?? "");
              setEditing(true);
            }}
            className="text-[11px] font-medium underline underline-offset-2 hover:no-underline"
          >
            Change decision
          </button>
        </div>
      ) : editing ? (
        <div className="space-y-2">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={3}
            maxLength={5000}
            className="w-full text-xs rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Revise the suggested wording…"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting !== null || draftText.trim().length === 0}
              onClick={() => decide("EDITED", draftText.trim())}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:-translate-y-0.5 transition-colors disabled:opacity-50"
            >
              Save Edited Version
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-cream text-muted-foreground hover:bg-cream/70 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => decide("ACCEPTED")}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-care-green-light text-[#3F6B3A] hover:bg-[#E3EFDD] transition-colors disabled:opacity-50"
          >
            {submitting === "ACCEPTED" ? "Saving…" : "Accept"}
          </button>
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => decide("REJECTED")}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-care-red-light text-[#A8402C] hover:bg-[#F6DCD5] transition-colors disabled:opacity-50"
          >
            {submitting === "REJECTED" ? "Saving…" : "Reject"}
          </button>
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => {
              setDraftText(flag.suggestedText ?? "");
              setEditing(true);
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-cream text-muted-foreground hover:bg-cream/70 transition-colors disabled:opacity-50"
          >
            Edit
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
