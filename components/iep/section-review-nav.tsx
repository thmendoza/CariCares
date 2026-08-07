"use client";

import type { SectionForReview } from "./section-review-experience";
import type { SectionReviewStatus } from "@/lib/review/section-status";

const STATUS_ICON: Record<SectionReviewStatus, string> = {
  completed: "✓",
  no_findings: "✓",
  in_review: "●",
  pending: "○",
  needs_manual_review: "!",
};

const STATUS_COLOR: Record<SectionReviewStatus, string> = {
  completed: "text-[#3F6B3A]",
  no_findings: "text-[#3F6B3A]",
  in_review: "text-[#8A5A28]",
  pending: "text-muted-foreground",
  needs_manual_review: "text-[#A8402C]",
};

// "Done" for progress-bar purposes = completed or no_findings — both mean
// nothing further is expected of the teacher in that section.
function isDone(status: SectionReviewStatus): boolean {
  return status === "completed" || status === "no_findings";
}

interface Props {
  sections: SectionForReview[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function SectionReviewNav({ sections, currentIndex, onSelect }: Props) {
  const doneCount = sections.filter((s) => isDone(s.status)).length;
  const percent = sections.length > 0 ? Math.round((doneCount / sections.length) * 100) : 0;

  return (
    <nav className="lg:sticky lg:top-20 lg:self-start">
      <div className="paper p-4">
        <p className="text-xs text-muted-foreground mb-2">
          {doneCount} of {sections.length} sections done
        </p>
        <div className="w-full h-1.5 bg-cream rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-care-green rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <ul className="space-y-1">
          {sections.map((section, i) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  i === currentIndex
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-cream"
                }`}
              >
                <span className={`${STATUS_COLOR[section.status]} font-semibold w-3 flex-shrink-0`}>
                  {STATUS_ICON[section.status]}
                </span>
                <span className="truncate">{section.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
