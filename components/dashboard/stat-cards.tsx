import { FileEdit, ClipboardList, Hourglass, CheckCircle2 } from "lucide-react";
import type { StatusBucket } from "@/lib/dashboard-stats";

const CARDS: { bucket: StatusBucket; label: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
  { bucket: "inProgress", label: "In Progress", icon: FileEdit, accent: "bg-cream text-foreground" },
  { bucket: "needsReview", label: "Needs Review", icon: ClipboardList, accent: "bg-primary/15 text-primary" },
  { bucket: "awaitingApproval", label: "Awaiting Approval", icon: Hourglass, accent: "bg-accent/50 text-accent-foreground" },
  { bucket: "completed", label: "Completed", icon: CheckCircle2, accent: "bg-secondary/15 text-secondary" },
];

export function StatCards({ counts }: { counts: Record<StatusBucket, number> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {CARDS.map((c) => (
        <div key={c.bucket} className="paper p-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.accent}`}>
            <c.icon className="w-[18px] h-[18px]" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{counts[c.bucket]}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
