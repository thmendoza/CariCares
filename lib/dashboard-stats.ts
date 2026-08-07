import { IepStatus } from "@/app/generated/prisma/client";

export type StatusBucket = "inProgress" | "needsReview" | "awaitingApproval" | "completed";

const BUCKET_BY_STATUS: Record<IepStatus, StatusBucket> = {
  DRAFT: "inProgress",
  SUBMITTED: "inProgress",
  IN_REVIEW: "needsReview",
  REVISIONS_NEEDED: "needsReview",
  COORDINATOR_APPROVED: "awaitingApproval",
  ADMIN_APPROVED: "completed",
  APPROVED: "completed",
};

/**
 * Pure presentation-layer grouping of already-fetched IEP statuses into the
 * dashboard's 4 summary buckets. Does not query anything — callers pass in
 * the latest status per student they already fetched.
 */
export function groupIepsByStatusBucket(statuses: (IepStatus | undefined | null)[]): Record<StatusBucket, number> {
  const counts: Record<StatusBucket, number> = {
    inProgress: 0,
    needsReview: 0,
    awaitingApproval: 0,
    completed: 0,
  };
  for (const status of statuses) {
    if (!status) continue;
    counts[BUCKET_BY_STATUS[status]]++;
  }
  return counts;
}
