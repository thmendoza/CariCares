import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StageTracker } from "@/components/iep/stage-tracker";
import { IepStatus, SectionType } from "@/app/generated/prisma/client";
import { TriggerReviewClient } from "./trigger-review-client";
import { DeleteButton } from "@/components/shared/delete-button";
import { EXPECTED_SECTION_TYPES } from "@/lib/parser";
import { injectHighlightMarks } from "@/lib/highlight/inject-marks";
import { StudentAcademicLevelForm } from "@/components/students/student-academic-level-form";
import { SyncedReviewPanel, type ReviewFlag } from "@/components/iep/synced-review-panel";
import { ReadinessSummary } from "@/components/iep/readiness-summary";
import { LoadingState } from "@/components/shared/states/loading-state";

const SECTION_LABELS: Record<SectionType, string> = {
  STUDENT_PARENT_INFO: "Student & Parent Information",
  BACKGROUND_HISTORY: "Background History",
  PRESENT_LEVEL_OF_PERFORMANCE: "Present Level of Performance",
  ANNUAL_GOALS: "Annual Goals",
  QUARTERLY_ACADEMIC_GOALS: "Quarterly Academic Goals",
  ACCOMMODATIONS: "Accommodations",
  MODIFICATIONS: "Modifications",
  RECOMMENDATIONS_AND_CONSENT: "Recommendations & Consent",
};

const STATUS_BADGE: Record<IepStatus, { label: string; className: string }> = {
  DRAFT:                { label: "Draft",            className: "bg-care-cream text-care-muted" },
  SUBMITTED:            { label: "Submitted",        className: "bg-care-cream text-care-muted" },
  IN_REVIEW:            { label: "In Review",        className: "bg-care-peach/40 text-[#8A5A28]" },
  REVISIONS_NEEDED:     { label: "Revisions Needed", className: "bg-care-red-light text-[#A8402C]" },
  COORDINATOR_APPROVED: { label: "Coord. Approved",  className: "bg-care-pink-mid text-[#A83E68]" },
  ADMIN_APPROVED:       { label: "Admin Approved",   className: "bg-care-green-light text-[#3F6B3A]" },
  APPROVED:             { label: "Approved",         className: "bg-care-green-light text-[#3F6B3A]" },
};

export default async function IepReviewPage({
  params,
}: {
  params: { studentId: string; iepId: string };
}) {
  const session = await auth();
  const userRole = session?.user?.role ?? "";

  const iep = await db.iep.findUnique({
    where: { id: params.iepId },
    include: {
      sections: { orderBy: { order: "asc" } },
      student: {
        select: {
          firstName: true,
          lastName: true,
          program: true,
          enrolledGradeLevel: true,
          subjectLevels: { select: { subject: true, gradeLevel: true } },
        },
      },
      uploadedBy: { select: { name: true } },
      aiFlags: {
        where: { status: { in: ["VISIBLE_TO_TEACHER", "PENDING_COORDINATOR"] } },
        orderBy: { createdAt: "asc" },
        include: { section: { select: { sectionType: true } } },
      },
      layerFindings: true,
    },
  });

  if (!iep || iep.studentId !== params.studentId) notFound();

  const badge = STATUS_BADGE[iep.status];
  const showReviewButton =
    iep.sections.length > 0 && iep.aiFlags.length === 0;

  const detectedTypes = new Set(iep.sections.map((s) => s.sectionType));
  const missingSections = EXPECTED_SECTION_TYPES.filter((t) => !detectedTypes.has(t));

  // Highlight each flag's source text directly in the rendered document, and
  // track which flags actually got a highlight so the side panel can link to it.
  const flagsBySection = new Map<string, typeof iep.aiFlags>();
  for (const flag of iep.aiFlags) {
    const list = flagsBySection.get(flag.sectionId) ?? [];
    list.push(flag);
    flagsBySection.set(flag.sectionId, list);
  }
  const matchedFlagIds = new Set<string>();
  const highlightedHtmlBySection = new Map<string, string>();
  for (const section of iep.sections) {
    const sectionFlags = flagsBySection.get(section.id) ?? [];
    const marks = sectionFlags
      .filter((f) => f.highlightText)
      .map((f) => ({ id: f.id, text: f.highlightText }));
    const { html, matchedIds } = injectHighlightMarks(section.rawHtml, marks);
    highlightedHtmlBySection.set(section.id, html);
    matchedIds.forEach((id) => matchedFlagIds.add(id));
  }

  // Every comment must anchor to something highlighted in the document — no
  // floating/unlinked comments. When a flag's exact text can't be located
  // (parser limitation, or the issue is genuinely about a whole section, e.g.
  // missing content), fall back to anchoring it to that section's heading
  // instead, which gets its own highlight treatment below.
  const sectionFallbackFlagIds = new Map<string, string[]>();
  for (const flag of iep.aiFlags) {
    if (matchedFlagIds.has(flag.id)) continue;
    const list = sectionFallbackFlagIds.get(flag.sectionId) ?? [];
    list.push(flag.id);
    sectionFallbackFlagIds.set(flag.sectionId, list);
  }

  const reviewFlags: ReviewFlag[] = iep.aiFlags.map((flag) => ({
    id: flag.id,
    severity: flag.severity,
    status: flag.status,
    category: flag.category,
    highlightText: flag.highlightText,
    recommendation: flag.recommendation,
    suggestedText: flag.suggestedText,
    sectionLabel: SECTION_LABELS[flag.section.sectionType],
    sectionId: flag.sectionId,
    anchorId: matchedFlagIds.has(flag.id) ? `flag-${flag.id}` : `section-anchor-${flag.sectionId}`,
    exactMatch: matchedFlagIds.has(flag.id),
  }));

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </Link>

      {/* Header */}
      <div className="paper p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-h2 text-foreground">
              {iep.student.lastName}, {iep.student.firstName}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {iep.schoolYear} · Q{iep.quarter} · Version {iep.version}
              {iep.uploadedBy?.name ? ` · Uploaded by ${iep.uploadedBy.name}` : ""}
            </p>
            <div className="mt-1">
              <StudentAcademicLevelForm
                studentId={params.studentId}
                initialProgram={iep.student.program}
                initialEnrolledGradeLevel={iep.student.enrolledGradeLevel}
                initialSubjectLevels={iep.student.subjectLevels}
                compact
              />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <DeleteButton
              endpoint={`/api/iep/${params.iepId}`}
              confirmMessage={`Delete this IEP (${iep.schoolYear} Q${iep.quarter} v${iep.version})? This cannot be undone.`}
              redirectTo="/dashboard"
              label="Delete IEP"
            />
            {showReviewButton && <TriggerReviewClient iepId={iep.id} />}
            {userRole === "TEACHER" && iep.sections.length > 0 && (
              <Link
                href={`/students/${params.studentId}/iep/${params.iepId}/review/section-review`}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
              >
                Review Section by Section
              </Link>
            )}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>

        <StageTracker status={iep.status} />
      </div>

      {iep.sections.length > 0 && missingSections.length > 0 && (
        <div className="rounded-card bg-care-red-light border border-care-red/30 p-4 mb-6">
          <p className="text-sm font-medium text-[#A8402C]">
            Parsing may be incomplete — {missingSections.length} of {EXPECTED_SECTION_TYPES.length}{" "}
            expected sections weren&apos;t detected in this upload:
          </p>
          <p className="text-xs text-[#A8402C]/80 mt-1">
            {missingSections.map((t) => SECTION_LABELS[t]).join(", ")}
          </p>
          <p className="text-xs text-[#A8402C]/80 mt-1">
            The AI review below may be based on partial content. Check the original document&apos;s
            formatting before relying on this review.
          </p>
        </div>
      )}

      <ReadinessSummary readiness={iep.overallReadiness} findings={iep.layerFindings} />

      {/* Section nav + synced document + AI suggestions panel.
          The section-jump rail lives here in the page (safe to restyle) —
          SyncedReviewPanel's own internal grid/positioning logic is untouched. */}
      {iep.sections.length === 0 ? (
        <LoadingState
          title="This IEP is still being processed…"
          description="Sections will appear here once parsing is complete."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">
          <nav className="hidden lg:block lg:sticky lg:top-20 lg:self-start space-y-1 paper p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
              Sections
            </p>
            {iep.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:bg-cream hover:text-foreground transition-colors truncate"
              >
                {SECTION_LABELS[section.sectionType] ?? section.title}
              </a>
            ))}
          </nav>

          <SyncedReviewPanel
            flags={reviewFlags}
            userRole={userRole}
            emptyMessage='No suggestions yet. Click "Run AI Review" to analyze.'
          >
            <div className="space-y-4">
              {iep.sections.map((section) => {
                const fallbackFlagIds = sectionFallbackFlagIds.get(section.id) ?? [];
                return (
                <div
                  key={section.id}
                  id={section.id}
                  className="paper p-6 scroll-mt-20"
                >
                  <h2 className="text-sm font-semibold text-foreground mb-4 pb-3 border-b border-border">
                    {fallbackFlagIds.length > 0 ? (
                      <mark
                        id={`section-anchor-${section.id}`}
                        data-flag-ids={fallbackFlagIds.join(",")}
                        className="bg-primary/20 rounded px-1 scroll-mt-20"
                      >
                        {SECTION_LABELS[section.sectionType] ?? section.title}
                      </mark>
                    ) : (
                      SECTION_LABELS[section.sectionType] ?? section.title
                    )}
                  </h2>
                  <div
                    className="prose prose-sm max-w-none text-foreground
                      prose-headings:text-foreground prose-headings:font-semibold
                      prose-p:leading-relaxed prose-li:leading-relaxed
                      prose-table:text-xs prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1"
                    /* A section's HTML can be a table fragment cut mid-table (the
                    source document's headers sit inside table cells), which the
                    browser silently repairs on parse — suppress the resulting
                    hydration warning since content isn't affected, only markup. */
                    suppressHydrationWarning
                    dangerouslySetInnerHTML={{
                      __html: highlightedHtmlBySection.get(section.id) ?? section.rawHtml,
                    }}
                  />
                </div>
                );
              })}
            </div>
          </SyncedReviewPanel>
        </div>
      )}
    </div>
  );
}
