import Link from "next/link";
import { StageTracker } from "./stage-tracker";
import { IepStatus, Program } from "@/app/generated/prisma/client";
import { DeleteButton } from "@/components/shared/delete-button";
import { cn } from "@/lib/utils";

const PROGRAM_LABELS: Record<Program, string> = {
  FULL_INCLUSION_NO_SERVICES: "Full Inclusion",
  FULL_INCLUSION_SHADOW: "Full Inclusion (Shadow)",
  PARTIAL_INCLUSION_PULLOUT: "Partial Inclusion – Pull-Out",
  PARTIAL_INCLUSION_INTENSIVE: "Partial Inclusion – Intensive",
  PRE_VOCATIONAL: "Pre-Vocational",
  EARLY_CHILDHOOD: "Early Childhood",
};

const NEXT_ACTION: Record<IepStatus, string> = {
  DRAFT: "Upload when ready",
  SUBMITTED: "Waiting to enter review",
  IN_REVIEW: "Review in progress",
  REVISIONS_NEEDED: "Revise and re-upload",
  COORDINATOR_APPROVED: "Awaiting admin approval",
  ADMIN_APPROVED: "Complete",
  APPROVED: "Complete",
};

interface StudentCardProps {
  studentId: string;
  firstName: string;
  lastName: string;
  program?: Program | null;
  teacherName?: string | null;
  latestIep?: {
    id: string;
    version: number;
    quarter: number;
    schoolYear: string;
    status: IepStatus;
    updatedAt: Date;
  } | null;
}

export function StudentCard({ studentId, firstName, lastName, program, teacherName, latestIep }: StudentCardProps) {
  const isRevisions = latestIep?.status === "REVISIONS_NEEDED";
  const isApproved = latestIep?.status === "APPROVED";

  return (
    <div
      className={cn(
        "paper p-5 flex flex-col gap-4 transition-transform hover:-translate-y-1",
        isRevisions ? "border-destructive" : isApproved ? "border-secondary" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate">
            {lastName}, {firstName}
          </h3>
          {program && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{PROGRAM_LABELS[program]}</p>
          )}
          {teacherName && (
            <p className="text-xs text-muted-foreground truncate">Teacher: {teacherName}</p>
          )}
        </div>
        {latestIep && (
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {latestIep.schoolYear} · Q{latestIep.quarter} · v{latestIep.version}
          </span>
        )}
      </div>

      {latestIep ? (
        <>
          <StageTracker status={latestIep.status} compact />
          <p className="text-xs text-muted-foreground -mt-2">{NEXT_ACTION[latestIep.status]}</p>
          <div className="flex items-center justify-between">
            <DeleteButton
              endpoint={`/api/iep/${latestIep.id}`}
              confirmMessage={`Delete this IEP (${latestIep.schoolYear} Q${latestIep.quarter} v${latestIep.version}) for ${firstName} ${lastName}? This cannot be undone.`}
              label="Delete IEP"
            />
            <Link
              href={`/students/${studentId}/iep/${latestIep.id}/review`}
              className="text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              Open IEP →
            </Link>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No IEP uploaded yet</p>
      )}

      <div className="border-t border-border pt-3 -mb-1">
        <DeleteButton
          endpoint={`/api/students/${studentId}`}
          confirmMessage={`Remove ${firstName} ${lastName} from the system? Their IEP history will be archived but they won't appear on the dashboard anymore.`}
          label="Remove student"
        />
      </div>
    </div>
  );
}
