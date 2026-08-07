import { cn } from "@/lib/utils";
import { IepStatus } from "@/app/generated/prisma/client";

const statusStyles: Record<IepStatus, string> = {
  DRAFT: "bg-care-cream text-[#6B6259]",
  SUBMITTED: "bg-care-pink-mid text-[#A83E68]",
  IN_REVIEW: "bg-care-pink-mid text-[#A83E68]",
  REVISIONS_NEEDED: "bg-care-red-light text-[#A8402C]",
  COORDINATOR_APPROVED: "bg-care-pink-mid text-[#A83E68]",
  ADMIN_APPROVED: "bg-care-green-light text-[#3F6B3A]",
  APPROVED: "bg-care-green-light text-[#3F6B3A]",
};

const statusLabels: Record<IepStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  IN_REVIEW: "In Review",
  REVISIONS_NEEDED: "Revisions Needed",
  COORDINATOR_APPROVED: "Coordinator Approved",
  ADMIN_APPROVED: "Admin Approved",
  APPROVED: "Approved",
};

interface StatusBadgeProps {
  status: IepStatus;
  className?: string;
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "pink" | "green" | "red" | "gray";
  className?: string;
}

function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-care-pink-mid text-[#A83E68]": variant === "pink",
          "bg-care-green-light text-[#3F6B3A]": variant === "green",
          "bg-care-red-light text-[#A8402C]": variant === "red",
          "bg-care-cream text-[#6B6259]": variant === "gray",
        },
        className
      )}
    >
      {children}
    </span>
  );
}

export { Badge, StatusBadge };
