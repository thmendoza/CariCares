import { Mascot } from "@/components/shared/mascot";

interface SuccessStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SuccessState({ title, description, action }: SuccessStateProps) {
  return (
    <div className="rounded-card bg-white border border-care-cream shadow-sm p-12 flex flex-col items-center text-center animate-bounce-in">
      <Mascot scene="celebrate" size="lg" className="mb-4" />
      <p className="text-sm font-medium text-care-charcoal">{title}</p>
      {description && <p className="text-xs text-care-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
