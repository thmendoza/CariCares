"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FlagSeverity, SectionType, TeacherDecision } from "@/app/generated/prisma/client";
import type { SectionReviewStatus } from "@/lib/review/section-status";
import { SectionReviewNav } from "./section-review-nav";
import { SectionReviewCard } from "./section-review-card";

export interface FlagForReview {
  id: string;
  severity: FlagSeverity;
  category: string;
  highlightText: string;
  recommendation: string;
  suggestedText: string | null;
  teacherDecision: TeacherDecision | null;
  teacherEditedText: string | null;
}

export interface SectionForReview {
  id: string;
  sectionType: SectionType;
  title: string;
  rawHtml: string;
  status: SectionReviewStatus;
  flags: FlagForReview[];
}

interface Props {
  studentLabel: string;
  sections: SectionForReview[];
}

// Milestone 3 — orchestrates section-by-section navigation as local client
// state over server-fetched data (see page.tsx). Recording a teacher
// decision calls router.refresh() to re-fetch fresh flag/status data from
// the server; currentIndex itself lives here and isn't reset by that
// refresh, so the teacher's place in the review is preserved.
export function SectionReviewExperience({ studentLabel, sections }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  if (sections.length === 0) {
    return (
      <div className="paper p-8 text-center">
        <p className="text-sm text-foreground">No parsed sections to review yet.</p>
      </div>
    );
  }

  const boundedIndex = Math.min(currentIndex, sections.length - 1);
  const current = sections[boundedIndex];

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">{studentLabel}</p>
        <h1 className="text-h2 text-foreground">Section Review</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <SectionReviewNav sections={sections} currentIndex={boundedIndex} onSelect={setCurrentIndex} />
        <SectionReviewCard
          section={current}
          index={boundedIndex}
          total={sections.length}
          onPrevious={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          onNext={() => setCurrentIndex((i) => Math.min(sections.length - 1, i + 1))}
          onDecided={() => router.refresh()}
        />
      </div>
    </div>
  );
}
