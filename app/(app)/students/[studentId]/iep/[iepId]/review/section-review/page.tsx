import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SECTION_TITLES } from "@/lib/parser";
import { computeSectionReviewStatus } from "@/lib/review/section-status";
import { SectionReviewExperience, type SectionForReview } from "@/components/iep/section-review-experience";

// Milestone 3 — teacher-facing section-by-section review. A VIEW over the
// existing AiFlag data already produced by lib/ai/review-orchestrator.ts;
// no new AI calls happen here. Strictly teacher-only (the existing synced
// full-document view at .../review remains the shared/coordinator view —
// this page doesn't replace it).
export default async function SectionReviewPage({
  params,
}: {
  params: { studentId: string; iepId: string };
}) {
  const session = await auth();
  if (session?.user?.role !== "TEACHER") {
    redirect(`/students/${params.studentId}/iep/${params.iepId}/review`);
  }

  const iep = await db.iep.findUnique({
    where: { id: params.iepId },
    include: {
      sections: { orderBy: { order: "asc" } },
      aiFlags: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!iep || iep.studentId !== params.studentId) notFound();

  const flagsBySection = new Map<string, typeof iep.aiFlags>();
  for (const flag of iep.aiFlags) {
    const list = flagsBySection.get(flag.sectionId) ?? [];
    list.push(flag);
    flagsBySection.set(flag.sectionId, list);
  }

  // Only the ACTUAL parsed sections for this IEP — never invented, never
  // padded out to the full 8-section expected list (a section the parser
  // genuinely didn't detect simply isn't part of this review).
  const sections: SectionForReview[] = iep.sections.map((section) => {
    const allFlagsForSection = flagsBySection.get(section.id) ?? [];
    const visibleFlags = allFlagsForSection.filter((f) => f.status === "VISIBLE_TO_TEACHER");

    return {
      id: section.id,
      sectionType: section.sectionType,
      title: SECTION_TITLES[section.sectionType] ?? section.title,
      rawHtml: section.rawHtml,
      status: computeSectionReviewStatus(
        allFlagsForSection.map((f) => ({ status: f.status, teacherDecision: f.teacherDecision }))
      ),
      flags: visibleFlags.map((f) => ({
        id: f.id,
        severity: f.severity,
        category: f.category,
        highlightText: f.highlightText,
        recommendation: f.recommendation,
        suggestedText: f.suggestedText,
        teacherDecision: f.teacherDecision,
        teacherEditedText: f.teacherEditedText,
      })),
    };
  });

  return (
    <div className="max-w-5xl mx-auto">
      <SectionReviewExperience
        studentLabel={`${iep.schoolYear} · Q${iep.quarter} · Version ${iep.version}`}
        sections={sections}
      />
    </div>
  );
}
