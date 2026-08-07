import { Mascot, type MascotScene } from "@/components/shared/mascot";

interface LoadingStateProps {
  title?: string;
  description?: string;
  mascotScene?: MascotScene;
}

export function LoadingState({
  title = "One moment…",
  description,
  mascotScene = "read",
}: LoadingStateProps) {
  return (
    <div className="rounded-card bg-white border border-care-cream shadow-sm p-12 flex flex-col items-center text-center">
      <Mascot scene={mascotScene} size="lg" className="mb-4 motion-safe:animate-float" />
      <p className="text-sm font-medium text-care-charcoal">{title}</p>
      {description && <p className="text-xs text-care-muted mt-1">{description}</p>}
    </div>
  );
}
