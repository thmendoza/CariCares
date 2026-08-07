/**
 * Deterministic, per-section review status — Milestone 3. Pure function,
 * no I/O, no AI call: derived entirely from AiFlag rows already produced by
 * lib/ai/review-orchestrator.ts and any teacher decisions already recorded.
 * Never persisted — recomputed on read, so it can never drift out of sync
 * with the underlying flags.
 */

export type SectionReviewStatus = "pending" | "in_review" | "completed" | "no_findings" | "needs_manual_review";

interface FlagForStatus {
  status: "PENDING_COORDINATOR" | "VISIBLE_TO_TEACHER" | "DISMISSED" | "RESOLVED";
  teacherDecision: "ACCEPTED" | "REJECTED" | "EDITED" | null;
}

/**
 * - pending: has teacher-visible findings, none decided yet.
 * - in_review: has teacher-visible findings, some decided, not all.
 * - completed: every teacher-visible finding has a teacher decision.
 * - no_findings: review has run and nothing is teacher-visible for this
 *   section, AND nothing is sitting behind the coordinator gate either —
 *   genuinely nothing flagged, not the same as "needs a closer look."
 * - needs_manual_review: nothing is teacher-visible, but at least one flag
 *   for this section IS sitting at PENDING_COORDINATOR — an existing,
 *   already-meaningful signal (a human — the coordinator — still needs to
 *   act) rather than an invented state. Never assigned just because a
 *   section happens to have zero findings.
 */
export function computeSectionReviewStatus(flags: FlagForStatus[]): SectionReviewStatus {
  const visible = flags.filter((f) => f.status === "VISIBLE_TO_TEACHER");

  if (visible.length === 0) {
    const hasPendingCoordinator = flags.some((f) => f.status === "PENDING_COORDINATOR");
    return hasPendingCoordinator ? "needs_manual_review" : "no_findings";
  }

  const decidedCount = visible.filter((f) => f.teacherDecision !== null).length;
  if (decidedCount === 0) return "pending";
  if (decidedCount === visible.length) return "completed";
  return "in_review";
}
