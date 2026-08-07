import { Mascot } from "@/components/shared/mascot";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: ErrorStateProps) {
  return (
    <div className="rounded-card bg-white border border-care-cream shadow-sm p-12 flex flex-col items-center text-center">
      <Mascot scene="confused" size="lg" className="mb-4" />
      <p className="text-sm font-medium text-care-charcoal">{title}</p>
      {description && <p className="text-xs text-care-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
