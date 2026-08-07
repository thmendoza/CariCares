"use client";

import type { SectionSummary } from "@/lib/parser";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const STATUS_STYLES: Record<SectionSummary["status"], { label: string; badge: string; border: string }> = {
  detected: { label: "Detected", badge: "bg-secondary/15 text-secondary", border: "border-l-care-green" },
  partial: { label: "Partially Completed", badge: "bg-care-peach/40 text-[#8A5A28]", border: "border-l-care-peach" },
  not_detected: { label: "Not Detected", badge: "bg-care-red-light text-[#A8402C]", border: "border-l-care-red" },
  needs_confirmation: {
    label: "Needs Confirmation",
    badge: "bg-primary/15 text-[#A83E68]",
    border: "border-l-care-pink",
  },
  // Not auto-assigned by the parser today (reserved for a future human-
  // confirmation feature) — styled defensively so the UI doesn't break if
  // one ever appears in a response.
  not_yet_completed: { label: "Not Yet Completed", badge: "bg-cream text-muted-foreground", border: "border-l-care-cream" },
  not_present_in_source: {
    label: "Not Present in Source",
    badge: "bg-cream text-muted-foreground",
    border: "border-l-care-cream",
  },
  misclassified: { label: "Misclassified", badge: "bg-care-red-light text-[#A8402C]", border: "border-l-care-red" },
};

export function ParsedSectionsPreview({ sections }: { sections: SectionSummary[] }) {
  return (
    <div className="paper p-5">
      <h2 className="text-sm font-semibold text-foreground mb-1">Preview Parsed IEP</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Mechanical section detection only — no AI review has run on this document.
      </p>
      <div className="space-y-2">
        {sections.map((section) => {
          const style = STATUS_STYLES[section.status];
          return (
            <div
              key={section.sectionType}
              className={cn(
                "border-l-4 rounded-r-lg border border-l-0 border-border p-3",
                style.border
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">{section.title}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {section.warningCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8A5A28]">
                      <AlertTriangle className="w-3 h-3" />
                      {section.warningCount}
                    </span>
                  )}
                  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", style.badge)}>
                    {style.label}
                  </span>
                </div>
              </div>
              {section.preview ? (
                <p className="text-xs text-muted-foreground leading-relaxed">{section.preview}</p>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">No content detected for this section.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
