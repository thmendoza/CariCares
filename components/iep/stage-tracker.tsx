import { cn } from "@/lib/utils";
import { IepStatus } from "@/app/generated/prisma/client";

const STAGES: { status: IepStatus; label: string }[] = [
  { status: "DRAFT",                label: "Draft" },
  { status: "SUBMITTED",            label: "Submitted" },
  { status: "IN_REVIEW",            label: "In Review" },
  { status: "REVISIONS_NEEDED",     label: "Revisions" },
  { status: "COORDINATOR_APPROVED", label: "Approved" },
  { status: "APPROVED",             label: "Final" },
];

const STATUS_ORDER: Record<IepStatus, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  IN_REVIEW: 2,
  REVISIONS_NEEDED: 3,
  COORDINATOR_APPROVED: 4,
  ADMIN_APPROVED: 4,
  APPROVED: 5,
};

interface StageTrackerProps {
  status: IepStatus;
  compact?: boolean;
}

export function StageTracker({ status, compact = false }: StageTrackerProps) {
  const currentOrder = STATUS_ORDER[status];
  const isRevisions = status === "REVISIONS_NEEDED";

  return (
    <div className="flex items-center w-full">
      {STAGES.map((stage, i) => {
        const stageOrder = STATUS_ORDER[stage.status];
        const isCompleted = stageOrder < currentOrder;
        const isActive = stageOrder === currentOrder;
        const isRevisionStage = stage.status === "REVISIONS_NEEDED";

        const dotColor = cn(
          isCompleted && "bg-care-green border-care-green",
          isActive && !isRevisions && "bg-care-pink-deep border-care-pink-deep",
          isActive && isRevisions && isRevisionStage && "bg-care-red border-care-red",
          !isCompleted && !isActive && "bg-white border-care-cream"
        );

        const lineColor = isCompleted ? "bg-care-green" : "bg-care-cream";

        return (
          <div key={stage.status} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={cn(
                  "rounded-full border-2 flex items-center justify-center transition-colors",
                  compact ? "w-2.5 h-2.5" : "w-5 h-5",
                  dotColor
                )}
              >
                {isCompleted && !compact && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {!compact && (
                <span
                  className={cn(
                    "text-[10px] mt-1 text-center whitespace-nowrap font-medium",
                    isActive && !isRevisions && "text-care-pink-deep",
                    isActive && isRevisions && isRevisionStage && "text-care-red-deep",
                    isCompleted && "text-care-green-deep",
                    !isCompleted && !isActive && "text-care-muted/50"
                  )}
                >
                  {stage.label}
                </span>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-1", lineColor)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
