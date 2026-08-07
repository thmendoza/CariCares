import { StatusBadge } from "@/components/ui/badge";
import { IepStatus } from "@/app/generated/prisma/client";

interface TimelineItem {
  studentName: string;
  status: IepStatus;
  updatedAt: Date;
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${Math.max(diffMins, 0)}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="paper p-5">
      <h2 className="text-h3 text-foreground mb-3">Recent Activity</h2>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground truncate">{item.studentName}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={item.status} />
              <span className="text-xs text-muted-foreground w-14 text-right">{relativeTime(item.updatedAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
